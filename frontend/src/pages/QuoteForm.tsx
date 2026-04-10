import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/cotacao';

// ===================================
// Types
// ===================================

interface Supplier {
  id: string;
  name: string;
  company?: string;
  categories: string[];
  rating: number;
  isOwn: boolean;
  isNetworkSupplier: boolean;
}

interface FormDataResponse {
  token: string;
  expiresAt: string;
  producer: {
    name: string;
    city: string;
    region: string;
  };
  suppliers: Supplier[];
}

interface QuoteItem {
  product: string;
  quantity: string;
  unit: string;
  hasObservation: boolean;
  observation: string;
}

const UNITS = ['kg', 'sacas', 'toneladas', 'litros', 'unidades', 'caixas', 'fardos'];

const CATEGORIES = [
  'Sementes',
  'Fertilizantes',
  'Defensivos',
  'Rações',
  'Combustível',
  'Equipamentos',
  'Outros',
];

function emptyItem(): QuoteItem {
  return { product: '', quantity: '', unit: 'sacas', hasObservation: false, observation: '' };
}

// ===================================
// Sub-components
// ===================================

function CountdownBanner({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); setTimeLeft(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min ${String(s).padStart(2, '0')}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (expired) return (
    <div className="bg-red-500 text-white px-4 py-3 text-center text-sm font-semibold">
      ⏰ Este link expirou. Solicite um novo pelo WhatsApp.
    </div>
  );
  if (!timeLeft) return null;
  const isUrgent = !timeLeft.includes('h');
  return (
    <div className={`px-4 py-3 text-center text-sm font-semibold ${isUrgent ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900'}`}>
      ⏳ Este link expira em {timeLeft}
    </div>
  );
}

// ===================================
// Main Page
// ===================================

export function QuoteForm() {
  const { token } = useParams<{ token: string }>();

  const [formData, setFormData] = useState<FormDataResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form fields
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([emptyItem()]);
  const [region, setRegion] = useState('');
  const [deadline, setDeadline] = useState('');
  const [observations, setObservations] = useState('');
  const [freight, setFreight] = useState<'CIF' | 'FOB'>('CIF');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<string>>(new Set());
  const [selectAllOwn, setSelectAllOwn] = useState(false);
  const [selectAllNetwork, setSelectAllNetwork] = useState(false);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API_BASE}/${token}`)
      .then((res) => {
        const data: FormDataResponse = res.data.data;
        setFormData(data);
        setRegion(data.producer.region || '');
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.response?.data?.error?.message || 'Link inválido ou expirado.');
        setLoading(false);
      });
  }, [token]);

  // ---- Item helpers ----

  const updateItem = (idx: number, patch: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ---- Supplier helpers ----

  const toggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAllOwn = (checked: boolean) => {
    setSelectAllOwn(checked);
    const ownIds = (formData?.suppliers ?? []).filter((s) => s.isOwn).map((s) => s.id);
    setSelectedSupplierIds((prev) => {
      const next = new Set(prev);
      ownIds.forEach((id) => checked ? next.add(id) : next.delete(id));
      return next;
    });
  };

  const handleSelectAllNetwork = (checked: boolean) => {
    setSelectAllNetwork(checked);
    const networkIds = (formData?.suppliers ?? []).filter((s) => !s.isOwn).map((s) => s.id);
    setSelectedSupplierIds((prev) => {
      const next = new Set(prev);
      networkIds.forEach((id) => checked ? next.add(id) : next.delete(id));
      return next;
    });
  };

  // ---- Submit ----

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const finalCategory = category === 'Outros' ? customCategory.trim() : category;

    if (!finalCategory) { setSubmitError('Selecione ou informe a categoria.'); return; }

    const validItems = items.filter((it) => it.product.trim() && parseFloat(it.quantity) > 0);
    if (validItems.length === 0) { setSubmitError('Adicione ao menos um item com produto e quantidade.'); return; }

    if (selectedSupplierIds.size === 0) { setSubmitError('Selecione ao menos um fornecedor.'); return; }

    setSubmitError(null);
    setSubmitting(true);

    try {
      await axios.post(`${API_BASE}/${token}`, {
        category: finalCategory,
        items: validItems.map((it) => ({
          product: it.product.trim(),
          quantity: parseFloat(it.quantity.replace(',', '.')),
          unit: it.unit,
          observation: it.hasObservation && it.observation.trim() ? it.observation.trim() : undefined,
        })),
        region: region.trim(),
        deadline,
        observations: observations.trim() || undefined,
        freight,
        paymentTerms: paymentTerms.trim(),
        selectedSupplierIds: Array.from(selectedSupplierIds),
      });
      setSubmitted(true);
    } catch (err: any) {
      const apiErr = err.response?.data?.error;
      if (apiErr?.details) {
        setSubmitError(apiErr.details.map((d: any) => d.message).join(' · '));
      } else {
        setSubmitError(apiErr?.message || 'Erro ao enviar cotação.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ===================================
  // Render states
  // ===================================

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <p className="text-green-700 text-lg">Carregando...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-red-700 mb-2">Link Inválido</h1>
        <p className="text-red-600">{loadError}</p>
        <p className="text-sm text-red-400 mt-3">Solicite um novo link pelo WhatsApp ao agente FarmFlow.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-green-700 mb-2">Cotação enviada!</h1>
        <p className="text-green-700 mb-4">
          Sua cotação foi registrada e já está sendo enviada aos fornecedores selecionados.
        </p>
        <div className="bg-white rounded-xl shadow-sm p-5 max-w-sm text-left border border-green-100">
          <p className="text-sm font-semibold text-green-700 mb-1">📱 Próximos passos</p>
          <p className="text-sm text-gray-600">
            Você receberá as atualizações de status da sua cotação diretamente pelo <strong>WhatsApp</strong>,
            pelo agente FarmFlow. Fique de olho nas mensagens!
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-6">Pode fechar esta página com segurança.</p>
      </div>
    );
  }

  const ownSuppliers = formData!.suppliers.filter((s) => s.isOwn);
  const networkSuppliers = formData!.suppliers.filter((s) => !s.isOwn);

  // ===================================
  // Form
  // ===================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white px-4 py-4">
        <div className="max-w-lg mx-auto">
          <p className="text-green-100 text-sm">🌾 FarmFlow</p>
          <h1 className="text-lg font-bold">Nova Cotação</h1>
          <p className="text-green-100 text-sm">{formData!.producer.name} — {formData!.producer.city}</p>
        </div>
      </div>

      <CountdownBanner expiresAt={formData!.expiresAt} />

      <div className="max-w-lg mx-auto px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Categoria */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-700">Categoria do produto *</h2>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${
                    category === cat
                      ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-green-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat}
                    checked={category === cat}
                    onChange={() => setCategory(cat)}
                    className="accent-green-600"
                  />
                  {cat}
                </label>
              ))}
            </div>
            {category === 'Outros' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Informe a categoria"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            )}
          </div>

          {/* Itens */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Produtos *</h2>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-green-600 font-semibold border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition-colors"
              >
                + Adicionar produto
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Item {idx + 1}
                  </p>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {/* Produto */}
                <input
                  type="text"
                  required
                  value={item.product}
                  onChange={(e) => updateItem(idx, { product: e.target.value })}
                  placeholder="Ex: Soja, Milho, Herbicida..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />

                {/* Quantidade + Unidade */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    placeholder="Qtd"
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(idx, { unit: e.target.value })}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* Observação por produto */}
                <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.hasObservation}
                    onChange={(e) => updateItem(idx, { hasObservation: e.target.checked, observation: '' })}
                    className="w-4 h-4 accent-green-600"
                  />
                  Adicionar observação para este produto
                </label>

                {item.hasObservation && (
                  <textarea
                    rows={2}
                    value={item.observation}
                    onChange={(e) => updateItem(idx, { observation: e.target.value })}
                    placeholder="Ex: Marca específica, embalagem, especificação técnica..."
                    className="w-full px-3 py-2 border border-green-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none bg-green-50"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Detalhes da entrega */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-700">Entrega</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Região / Cidade de entrega *</label>
              <input
                type="text"
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Ex: Rio Verde, Goiânia, Jataí"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Prazo máximo de entrega *</label>
              <input
                type="date"
                required
                value={deadline}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-2">Tipo de frete *</label>
              <div className="flex gap-3">
                {(['CIF', 'FOB'] as const).map((f) => (
                  <label
                    key={f}
                    className={`flex-1 flex items-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                      freight === f
                        ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-green-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="freight"
                      value={f}
                      checked={freight === f}
                      onChange={() => setFreight(f)}
                      className="accent-green-600"
                    />
                    <span>
                      <strong>{f}</strong>
                      <span className="text-xs block font-normal text-gray-500">
                        {f === 'CIF' ? 'Fornecedor entrega' : 'Você retira'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Condições comerciais */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-gray-700">Condições comerciais</h2>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Condição de pagamento *</label>
              <input
                type="text"
                required
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Ex: à vista, 30/60 dias, boleto, safra"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Observações gerais (opcional)</label>
              <textarea
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Informações adicionais para todos os fornecedores"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
          </div>

          {/* Seleção de fornecedores */}
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Fornecedores *</h2>
              <span className="text-xs text-gray-400">{selectedSupplierIds.size} selecionado(s)</span>
            </div>

            {ownSuppliers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Meus fornecedores</p>
                  <label className="flex items-center gap-1.5 text-xs text-green-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAllOwn}
                      onChange={(e) => handleSelectAllOwn(e.target.checked)}
                      className="w-3.5 h-3.5 accent-green-600"
                    />
                    Todos
                  </label>
                </div>
                {ownSuppliers.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                      selectedSupplierIds.has(s.id)
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 hover:border-green-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSupplierIds.has(s.id)}
                      onChange={() => toggleSupplier(s.id)}
                      className="w-4 h-4 accent-green-600 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                      {s.company && <p className="text-xs text-gray-500 truncate">{s.company}</p>}
                    </div>
                    {s.rating > 0 && (
                      <span className="ml-auto text-xs text-amber-500 flex-shrink-0">⭐ {s.rating.toFixed(1)}</span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {networkSuppliers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rede FarmFlow</p>
                  <label className="flex items-center gap-1.5 text-xs text-green-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAllNetwork}
                      onChange={(e) => handleSelectAllNetwork(e.target.checked)}
                      className="w-3.5 h-3.5 accent-green-600"
                    />
                    Todos
                  </label>
                </div>
                {networkSuppliers.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                      selectedSupplierIds.has(s.id)
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 hover:border-green-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSupplierIds.has(s.id)}
                      onChange={() => toggleSupplier(s.id)}
                      className="w-4 h-4 accent-green-600 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                      {s.categories.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">{s.categories.join(', ')}</p>
                      )}
                    </div>
                    {s.rating > 0 && (
                      <span className="ml-auto text-xs text-amber-500 flex-shrink-0">⭐ {s.rating.toFixed(1)}</span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {ownSuppliers.length === 0 && networkSuppliers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Nenhum fornecedor encontrado. Cadastre fornecedores pelo FarmFlow.
              </p>
            )}
          </div>

          {/* Erro de submissão */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Botão de envio */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {submitting ? 'Enviando cotação...' : '✅ Enviar Cotação'}
          </button>

          <p className="text-xs text-center text-gray-400 pb-6">
            Ao enviar, sua cotação será registrada e os fornecedores selecionados serão notificados automaticamente.
          </p>
        </form>
      </div>
    </div>
  );
}
