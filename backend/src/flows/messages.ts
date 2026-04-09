/**
 * Templates de mensagens em português do Brasil
 * Todas as mensagens do bot com formatação e emojis
 */

export const Messages = {
  // ===================================
  // MENSAGENS DO PRODUTOR
  // ===================================

  WELCOME: (producerName?: string) => {
    const greeting = producerName ? `Olá ${producerName}!` : 'Olá!';
    return `${greeting} 👋 Bem-vindo ao *CotaAgro*

💡 *Economize até 5 horas por semana* em cotações de insumos agrícolas.

Vou te ajudar a encontrar os melhores preços de forma rápida e automática!

🚀 Pronto para sua primeira cotação?
• *1* ou *começar* - Solicitar cotação
• *2* ou *fornecedor* - Adicionar fornecedor
• *ajuda* - Ver como funciona`;
  },

  START_QUOTE: `Ótimo! Vamos criar sua cotação. 📋`,

  ASK_CATEGORY: (categories: string[]) => {
    if (categories.length === 0) {
      return `Qual a *categoria* do produto que deseja cotar?\n\nDigite a categoria (ex: sementes, fertilizantes, defensivos, rações)`;
    }

    let message = `*Qual categoria você deseja cotar?*\n\n`;
    categories.forEach((cat, i) => {
      message += `${i + 1}️⃣ ${cat}\n`;
    });
    message += `\nResponda com o *número* da categoria ou digite outra.`;
    return message;
  },

  ASK_FREIGHT: `*O frete é CIF ou FOB?*

🚚 *1 - CIF* — O fornecedor entrega na sua propriedade (frete incluso no preço)
📦 *2 - FOB* — Você retira no fornecedor (frete por sua conta)

Responda com *1* ou *2*.`,

  ASK_PAYMENT_TERMS: (freight: string) => `✅ *Frete:* ${freight === 'CIF' ? 'CIF (entrega inclusa)' : 'FOB (retira no fornecedor)'}

💳 *Qual a forma de pagamento desejada?*

Exemplos:
• À vista
• 30/60
• Safra
• Safrinha`,

  ASK_QUANTITY: (product: string) => `✅ *Produto:* ${product}

*Qual a quantidade desejada?*

Exemplos: 100 sacos, 500 kg, 20 litros`,

  ASK_REGION: (quantity?: string, unit?: string) => {
    const quantityText = quantity && unit ? `✅ *Quantidade:* ${quantity} ${unit}\n\n` : '';
    return `${quantityText}*Qual a região/cidade de entrega?*

Exemplo: Goiânia, Rio Verde, Jataí`;
  },

  ASK_DEADLINE: (region?: string) => {
    const regionText = region ? `✅ *Região:* ${region}\n\n` : '';
    return `${regionText}*Qual o prazo desejado para entrega?*

Exemplos:
• amanhã
• em 5 dias
• 30/03/2024`;
  },

  ASK_OBSERVATIONS_OPTIONAL: (deadline: string) => `✅ *Prazo:* ${deadline}

📝 *Alguma observação adicional?*

Se não tiver observações, é só confirmar:
✅ Continuar sem observações

Ou digite sua observação e pressione Enter.`,

  ASK_SUPPLIER_SCOPE: `Entendido! 📝

*Para quais fornecedores deseja enviar a cotação?*

1️⃣ Apenas meus fornecedores
2️⃣ Apenas rede CotaAgro
3️⃣ Todos (meus + rede)

*Responda com o número:* 1, 2 ou 3`,

  CONFIRM_QUOTE: (summary: {
    category?: string;
    items: Array<{ product: string; quantity: number; unit: string }>;
    region: string;
    deadline: string;
    observations?: string;
    freight?: string;
    quotePaymentTerms?: string;
    scope: string;
  }) => {
    const itemsText = summary.items
      .map((it, i) => `  ${i + 1}. ${it.product} — ${it.quantity} ${it.unit}`)
      .join('\n');

    return `✅ *Confirme os dados da sua cotação:*

${summary.category ? `🏷️ *Categoria:* ${summary.category}\n` : ''}📦 *Produtos:*\n${itemsText}
📍 *Região:* ${summary.region}
⏰ *Prazo:* ${summary.deadline}
${summary.observations ? `📝 *Obs:* ${summary.observations}\n` : ''}${summary.freight ? `🚚 *Frete:* ${summary.freight === 'CIF' ? 'CIF (entrega inclusa)' : 'FOB (retira no fornecedor)'}\n` : ''}${summary.quotePaymentTerms ? `💳 *Pagamento:* ${summary.quotePaymentTerms}\n` : ''}🎯 *Fornecedores:* ${summary.scope}

✅ Sim, enviar
✏️ Corrigir

*Está correto?*`;
  },

  QUOTE_DISPATCHED: (quoteId: string, suppliersCount: number) => `Cotação enviada com sucesso! 🚀

*ID da cotação:* ${quoteId.substring(0, 8)}
*Enviada para:* ${suppliersCount} fornecedor(es)

Você receberá um resumo com as propostas em breve. ⏳`,

  QUOTE_SUMMARY: (proposals: Array<{
    rank: number;
    supplierName: string;
    isOwn: boolean;
    totalPrice: number;
    deliveryDays: number;
    paymentTerms: string;
    observations?: string;
  }>) => {
    let message = `📊 *Resumo da Cotação*\n\n`;
    message += `Propostas recebidas (menor → maior valor):\n\n`;

    proposals.forEach((p) => {
      const badge = p.isOwn ? '(Seu fornecedor)' : '(Rede CotaAgro)';
      message += `${p.rank}️⃣ *${p.supplierName}* ${badge}\n`;
      message += `💰 R$ ${p.totalPrice.toFixed(2)}\n`;
      message += `📅 Entrega em ${p.deliveryDays} dias\n`;
      message += `💳 ${p.paymentTerms}\n`;
      if (p.observations) {
        message += `📝 ${p.observations}\n`;
      }
      message += `\n`;
    });

    message += `Responda com o *número* do fornecedor que deseja escolher ou *cancelar* para encerrar.`;
    return message;
  },

  QUOTE_CLOSED: (supplierName: string) => `Cotação fechada com sucesso! 🎉

Fornecedor escolhido: *${supplierName}*

Entraremos em contato para finalizar os detalhes. Obrigado por usar o CotaAgro! 🌾`,

  QUOTE_CANCELLED: `Cotação cancelada. ❌

Se precisar de ajuda, digite *ajuda*.`,

  QUOTA_EXCEEDED: (limit: number) => `⚠️ *Limite de cotações atingido!*

Você atingiu o limite de *${limit} cotações* do seu plano neste mês.

Entre em contato para fazer upgrade do seu plano. 📈`,

  // ===================================
  // CADASTRO DE FORNECEDOR
  // ===================================

  ADD_SUPPLIER_INSTRUCTIONS: `Ótimo! Vou te ajudar a cadastrar um fornecedor. 📇

*Compartilhe o contato* do fornecedor usando o WhatsApp:
1. Toque no ícone de anexo (📎)
2. Selecione "Contato"
3. Escolha o fornecedor
4. Envie

Ou você pode digitar os dados no formato:
*Nome:* João Silva
*Telefone:* 64999999999
*Empresa:* (opcional)
*Email:* (opcional)`,

  SUPPLIER_ADDED_SUCCESS: (supplierName: string) => `✅ *Fornecedor cadastrado com sucesso!*

*Nome:* ${supplierName}

O fornecedor foi adicionado à sua rede pessoal e já pode receber cotações.

Digite *1* para fazer uma nova cotação ou *ajuda* para ver mais opções.`,

  ASK_SUPPLIER_CATEGORY: (supplierName: string, categories: string[]) => {
    let message = `✅ *Fornecedor cadastrado:* ${supplierName}\n\n`;
    message += `📂 *Qual é a categoria deste fornecedor?*\n\n`;

    if (categories.length > 0) {
      categories.forEach((cat, i) => {
        message += `${i + 1}️⃣ ${cat}\n`;
      });
      message += `\nResponda com o(s) *número(s)* (ex: *1* ou *1,3*) ou digite uma nova categoria.`;
    } else {
      message += `Digite a categoria do fornecedor.\n\nExemplos: sementes, fertilizantes, defensivos, rações`;
    }

    return message;
  },

  SUPPLIER_CATEGORY_SAVED: (supplierName: string, categories: string[]) =>
    `✅ *Fornecedor atualizado!*\n\n*Nome:* ${supplierName}\n📂 *Categorias:* ${categories.join(', ')}\n\nO fornecedor já pode receber cotações.\n\nDigite *1* para fazer uma nova cotação ou *2* para adicionar outro fornecedor.`,

  SUPPLIER_ALREADY_EXISTS: (supplierName: string) => `⚠️ Este fornecedor já está cadastrado!

*Nome:* ${supplierName}

Digite *1* para fazer uma nova cotação ou *2* para adicionar outro fornecedor.`,

  SUPPLIER_ADD_ERROR: `❌ Não consegui processar o contato.

Por favor, tente novamente ou digite os dados manualmente no formato:
*Nome:* João Silva
*Telefone:* 64999999999
*Empresa:* (opcional)
*Email:* (opcional)

Digite *cancelar* para voltar ao menu.`,

  // ===================================
  // MENSAGENS DO FORNECEDOR
  // ===================================

  NEW_QUOTE_NOTIFICATION: (quote: {
    id: string;
    producerName: string;
    producerCity: string;
    category?: string;
    // Multi-item
    items?: Array<{ product: string; quantity: number | string; unit: string }>;
    // Legado (1 item)
    product?: string;
    quantity?: string;
    unit?: string;
    region: string;
    deadline: string;
    observations?: string;
    freight?: string;
    paymentTerms?: string;
    proposalFormUrl?: string; // link para formulário web (multi-item)
  }) => {
    const items = quote.items && quote.items.length > 0
      ? quote.items
      : quote.product ? [{ product: quote.product, quantity: quote.quantity || '', unit: quote.unit || '' }] : [];

    let message = `Olá! 👋 Sou o *CotaAgro*, assistente de cotações do produtor *${quote.producerName}* (${quote.producerCity}).\n\n`;
    message += `Ele está buscando proposta para:\n\n`;

    if (quote.category) message += `🏷️ *Categoria:* ${quote.category}\n`;
    message += `📦 *Produtos solicitados:*\n`;
    items.forEach((it) => {
      message += `  • ${it.product} — ${it.quantity} ${it.unit}\n`;
    });
    message += `\n📅 *Dt. Entrega:* ${quote.deadline}\n`;
    message += `📍 ${quote.region}\n`;
    if (quote.freight) {
      message += `🚚 *Frete:* ${quote.freight === 'CIF' ? 'CIF (entrega inclusa)' : 'FOB (retira no fornecedor)'}\n`;
    }
    if (quote.paymentTerms) message += `💳 *Pagamento:* ${quote.paymentTerms}\n`;
    if (quote.observations) message += `📝 *Obs:* ${quote.observations}\n`;

    message += `\nVocê tem interesse em enviar uma proposta?\n`;

    if (quote.proposalFormUrl) {
      // Multi-item: link para formulário web (URL sozinha na linha para ser clicável no WhatsApp)
      message += `\n✅ Para enviar sua proposta, acesse:\n`;
      message += `${quote.proposalFormUrl}\n\n`;
      message += `*2* — Não tenho interesse desta vez`;
    } else {
      // 1 item: fluxo WhatsApp
      message += `*1* — Sim, quero participar\n`;
      message += `*2* — Não, desta vez não`;
    }

    return message;
  },

  ASK_PRICE: `Ótimo! Vamos registrar sua proposta. 💰

*Qual o preço total da sua proposta?*

Exemplo: 15000 (apenas números, sem R$)`,

  ASK_DELIVERY: `Perfeito! 📦

*Prazo de entrega em dias?*

Exemplo: 5 (apenas o número)`,

  ASK_PAYMENT: `Entendido! ⏰

*Qual a condição de pagamento?*

Exemplo: 30 dias, à vista, 50% antecipado`,

  ASK_SUPPLIER_OBS: `Certo! 💳

*Alguma observação sobre sua proposta?*

Digite *não* se não houver.`,

  PROPOSAL_SENT: `Proposta enviada com sucesso! ✅

O produtor receberá sua oferta junto com as demais propostas.

Você será notificado se for selecionado. 🎯`,

  /**
   * Confirmação de envio de proposta (sem revelar posição/ranking)
   */
  PROPOSAL_SENT_WITH_RANKING: (data: {
    totalProposals: number;
    yourPrice: number;
    expiresIn: string;
  }) => {
    let message = `✅ *Proposta enviada com sucesso!*\n\n`;
    message += `💰 Sua proposta: R$ ${data.yourPrice.toFixed(2)}\n`;
    message += `👥 ${data.totalProposals} proposta(s) recebida(s) até agora\n`;
    message += `⏱️ Cotação expira em: ${data.expiresIn}\n\n`;
    message += `Você será notificado quando o produtor tomar uma decisão. 🎯`;

    return message;
  },

  /**
   * Feedback para fornecedor que perdeu
   */
  PROPOSAL_NOT_SELECTED: (data: {
    winningPrice: number;
    yourPrice: number;
    producerName: string;
  }) => {
    const diff = data.yourPrice - data.winningPrice;
    const diffPercent = ((diff / data.winningPrice) * 100).toFixed(1);

    let message = `📊 *Resultado da Cotação*\n\n`;
    message += `Infelizmente sua proposta não foi selecionada desta vez.\n\n`;
    message += `*Feedback:*\n`;
    message += `• Proposta vencedora: R$ ${data.winningPrice.toFixed(2)}\n`;
    message += `• Sua proposta: R$ ${data.yourPrice.toFixed(2)}\n`;
    message += `• Diferença: R$ ${diff.toFixed(2)} (${diffPercent}% mais cara)\n\n`;

    message += `💡 *Dica para próxima:*\n`;
    if (diff > data.winningPrice * 0.1) {
      message += `Reduza pelo menos 10% para ser mais competitivo\n`;
    } else if (diff > data.winningPrice * 0.05) {
      message += `Reduza 5-10% para aumentar suas chances\n`;
    } else {
      message += `Você estava bem próximo! Continue assim.\n`;
    }

    message += `\nContinue participando! 🚀`;

    return message;
  },

  /**
   * Feedback para fornecedor que ganhou
   */
  PROPOSAL_SELECTED: (data: { producerName: string; producerPhone: string }) => `🎉 *Parabéns! Você foi selecionado!*

O produtor *${data.producerName}* escolheu sua proposta.

📞 *Próximos passos:*
Entre em contato para finalizar os detalhes:
Telefone: ${data.producerPhone}

Boa negociação! 🤝`,

  PROPOSAL_DECLINED: `Sem problemas! 👍

Obrigado pelo retorno.`,

  // ===================================
  // MENSAGENS GENÉRICAS
  // ===================================

  UNKNOWN_INPUT: `Desculpe, não entendi sua mensagem. 🤔

Digite *ajuda* para ver as opções disponíveis.`,

  HELP: `*CotaAgro - Ajuda* 📚

*Comandos disponíveis:*
• *nova cotação* - Solicitar cotação
• *cancelar* - Cancelar ação atual
• *ajuda* - Ver esta mensagem

*Como funciona:*
1️⃣ Você solicita uma cotação
2️⃣ Enviamos para seus fornecedores
3️⃣ Você recebe as propostas organizadas
4️⃣ Escolhe a melhor opção

Dúvidas? Entre em contato com o suporte.`,

  ERROR: `Ops! Ocorreu um erro. 😔

Tente novamente em alguns instantes. Se o problema persistir, entre em contato com o suporte.`,

  /**
   * Mensagem de erro com sugestões inteligentes
   */
  ERROR_WITH_SUGGESTIONS: (userInput: string, suggestions: string[]) => {
    let message = `❌ Não entendi "${userInput}".\n\n`;

    if (suggestions.length > 0) {
      message += `Você quis dizer:\n`;
      suggestions.forEach((suggestion, index) => {
        message += `${index + 1}️⃣ ${suggestion}\n`;
      });
      message += `\n`;
    }

    message += `Ou digite novamente:`;
    return message;
  },

  /**
   * Mensagem oferecendo repetir última cotação
   */
  REPEAT_LAST_QUOTE: (last: {
    product: string;
    quantity: string;
    unit: string;
    region: string;
    deadline?: string;
  }) => {
    const deadlineText = last.deadline
      ? `⏰ Prazo: ${new Date(last.deadline).toLocaleDateString('pt-BR')}`
      : '';

    return `💡 *Quer repetir sua última cotação?*

📦 ${last.product}
📊 ${last.quantity} ${last.unit}
📍 ${last.region}
${deadlineText}

1️⃣ Sim, repetir
2️⃣ Nova cotação`;
  },
};
