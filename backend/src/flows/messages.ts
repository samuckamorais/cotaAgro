/**
 * Templates de mensagens em português do Brasil
 * Todas as mensagens do bot com formatação e emojis
 */

export const Messages = {
  // ===================================
  // MENSAGENS DO PRODUTOR
  // ===================================

  /**
   * Boas-vindas — diferencia primeira vez de usuário recorrente
   */
  WELCOME: (producerName?: string, isReturning = false) => {
    const name = producerName ? ` ${producerName}` : '';

    if (isReturning) {
      return `Olá${name}! 👋 O que vamos cotar hoje?

1 — Nova cotação
2 — Adicionar fornecedor`;
    }

    return `Olá${name}! 👋 Seja bem-vindo ao *FarmFlow*.

Sou seu assistente de cotações agrícolas — você me descreve o que precisa e eu envio para seus fornecedores, organizando as propostas pra você.

Por onde quer começar?

1 — Fazer uma cotação
2 — Cadastrar fornecedor
_ajuda_ — Ver como funciona`;
  },

  ASK_QUOTE_MODE: `Certo! Sua cotação tem *mais de 1 produto*?

1 — Sim, são vários produtos
2 — Não, é apenas 1 produto`,

  QUOTE_FORM_LINK: (url: string) =>
    `Ótimo! Como sua cotação tem vários produtos, preparei um formulário para você preencher tudo de uma vez 📋\n\n${url}\n\n_Válido por 2 horas._ Após enviar, eu disparo para os fornecedores e te aviso aqui pelo WhatsApp.\n\nQualquer dúvida, é só chamar.`,

  START_QUOTE: `Certo! Vamos criar sua cotação.`,

  ASK_CATEGORY: (categories: string[]) => {
    if (categories.length === 0) {
      return `Qual a *categoria* do produto?\n\nEx: sementes, fertilizantes, defensivos, rações`;
    }

    let message = `Qual a categoria do produto?\n\n`;
    categories.forEach((cat, i) => {
      message += `${i + 1} — ${cat}\n`;
    });
    message += `\nResponda com o número ou escreva outra categoria.`;
    return message;
  },

  ASK_PRODUCT: (category: string) =>
    `Categoria: *${category}*\n\nQual produto você quer cotar?\n\nEx: soja, milho, fertilizante NPK, herbicida`,

  ASK_MORE_ITEMS: (items: Array<{ product: string; quantity: number; unit: string }>) => {
    const list = items.map((it, i) => `  ${i + 1}. ${it.product} — ${it.quantity} ${it.unit}`).join('\n');
    return `Itens até agora:\n${list}\n\nQuer adicionar mais um item?\n\n1 — Sim, adicionar\n2 — Não, continuar`;
  },

  ASK_QUANTITY: (product: string) =>
    `Qual a quantidade de *${product}*?\n\nEx: 100 sacas, 500 kg, 20 litros`,

  ASK_REGION: () =>
    `Qual a cidade ou região de entrega?\n\nEx: Goiânia, Rio Verde, Jataí`,

  ASK_DEADLINE: () =>
    `Qual o prazo máximo para entrega?\n\nEx: amanhã, em 5 dias, 30/06`,

  ASK_OBSERVATIONS_OPTIONAL: () =>
    `Tem alguma observação para os fornecedores?\n\nSe não tiver, responda *não*.`,

  ASK_FREIGHT: `O frete é CIF ou FOB?

1 — *CIF* — fornecedor entrega na propriedade
2 — *FOB* — você retira no fornecedor`,

  ASK_PAYMENT_TERMS: (freight: string) =>
    `Frete: *${freight === 'CIF' ? 'CIF (entrega inclusa)' : 'FOB (retira no fornecedor)'}*\n\nQual a condição de pagamento?\n\nEx: à vista, 30/60, safra, safrinha`,

  ASK_SUPPLIER_SCOPE: `Para quais fornecedores enviar?

1 — Meus fornecedores
2 — Rede FarmFlow
3 — Todos`,

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

    let msg = `*Resumo da cotação:*\n\n`;
    if (summary.category) msg += `Categoria: ${summary.category}\n`;
    msg += `Produtos:\n${itemsText}\n`;
    msg += `Região: ${summary.region}\n`;
    msg += `Prazo: ${summary.deadline}\n`;
    if (summary.freight) msg += `Frete: ${summary.freight === 'CIF' ? 'CIF (entrega inclusa)' : 'FOB (retira)'}\n`;
    if (summary.quotePaymentTerms) msg += `Pagamento: ${summary.quotePaymentTerms}\n`;
    if (summary.observations) msg += `Obs: ${summary.observations}\n`;
    msg += `Fornecedores: ${summary.scope}\n`;
    msg += `\nConfirma?\n\n*sim* — enviar\n*corrigir* — recomeçar`;
    return msg;
  },

  QUOTE_DISPATCHED: (suppliersCount: number) =>
    `Cotação enviada para *${suppliersCount} fornecedor(es)*. ✅\n\nVocê receberá um resumo das propostas assim que elas chegarem. Fique de olho aqui! 👀`,

  QUOTE_SUMMARY: (proposals: Array<{
    rank: number;
    supplierName: string;
    isOwn: boolean;
    totalPrice: number;
    deliveryDays: number;
    paymentTerms: string;
    observations?: string;
  }>) => {
    let message = `*Propostas recebidas* (do menor ao maior preço):\n\n`;

    proposals.forEach((p) => {
      const badge = p.isOwn ? 'seu fornecedor' : 'rede FarmFlow';
      message += `*${p.rank}. ${p.supplierName}* (${badge})\n`;
      message += `   💰 R$ ${p.totalPrice.toFixed(2)}`;
      message += ` · 📅 ${p.deliveryDays} dias`;
      message += ` · 💳 ${p.paymentTerms}\n`;
      if (p.observations) message += `   📝 ${p.observations}\n`;
      message += `\n`;
    });

    message += `Responda com o *número* para escolher o fornecedor\nou *cancelar* para encerrar sem escolher.`;
    return message;
  },

  QUOTE_CLOSED: (supplierName: string) =>
    `Fechado com *${supplierName}*! 🎉\n\nO fornecedor já foi notificado. Boa negociação! 🤝`,

  QUOTE_CANCELLED: `Cotação cancelada.\n\nQuando quiser, é só mandar "nova cotação".`,

  QUOTA_EXCEEDED: (limit: number) =>
    `Você atingiu o limite de *${limit} cotações* do seu plano este mês.\n\nEntre em contato para fazer upgrade. 📈`,

  // ===================================
  // CADASTRO DE FORNECEDOR
  // ===================================

  ADD_SUPPLIER_INSTRUCTIONS: `Ótimo! Para cadastrar um fornecedor, *compartilhe o contato* dele pelo WhatsApp:

1. Toque no clipe (📎)
2. Selecione "Contato"
3. Escolha o fornecedor e envie

Ou, se preferir, digita assim:
*Nome:* João Silva
*Telefone:* 64999999999`,

  SUPPLIER_ADDED_SUCCESS: (supplierName: string) =>
    `*${supplierName}* foi cadastrado! ✅\n\nEle já pode receber cotações suas.\n\nQuer fazer uma cotação agora? Manda *1*.`,

  ASK_SUPPLIER_CATEGORY: (supplierName: string, categories: string[]) => {
    let message = `*${supplierName}* adicionado!\n\n`;
    message += `Qual é a área de atuação dele?\n\n`;

    if (categories.length > 0) {
      categories.forEach((cat, i) => {
        message += `${i + 1} — ${cat}\n`;
      });
      message += `\nResponda com o(s) número(s) ou escreva a categoria.\nEx: *1* ou *1,3*`;
    } else {
      message += `Ex: sementes, fertilizantes, defensivos, rações`;
    }

    return message;
  },

  SUPPLIER_CATEGORY_SAVED: (supplierName: string, categories: string[]) =>
    `Pronto! *${supplierName}* está cadastrado com: ${categories.join(', ')}.\n\nJá pode receber cotações. 👍\n\n1 — Nova cotação\n2 — Cadastrar outro fornecedor`,

  SUPPLIER_ALREADY_EXISTS: (supplierName: string) =>
    `*${supplierName}* já está na sua lista de fornecedores.\n\n1 — Nova cotação\n2 — Cadastrar outro`,

  SUPPLIER_ADD_ERROR: `Não consegui identificar o contato. Tente de novo ou escreva assim:

*Nome:* João Silva
*Telefone:* 64999999999

_cancelar_ — voltar ao menu`,

  // ===================================
  // MENSAGENS DO FORNECEDOR
  // ===================================

  NEW_QUOTE_NOTIFICATION: (quote: {
    id: string;
    producerName: string;
    producerCity: string;
    category?: string;
    items?: Array<{ product: string; quantity: number | string; unit: string }>;
    product?: string;
    quantity?: string;
    unit?: string;
    region: string;
    deadline: string;
    observations?: string;
    freight?: string;
    paymentTerms?: string;
    proposalFormUrl?: string;
  }) => {
    const items = quote.items && quote.items.length > 0
      ? quote.items
      : quote.product
        ? [{ product: quote.product, quantity: quote.quantity || '', unit: quote.unit || '' }]
        : [];

    let message = `Olá! 👋 Chegou uma solicitação de cotação de *${quote.producerName}* (${quote.producerCity}).\n\n`;

    if (quote.category) message += `Categoria: *${quote.category}*\n`;
    message += `Produtos:\n`;
    items.forEach((it) => {
      message += `  • ${it.product} — ${it.quantity} ${it.unit}\n`;
    });
    message += `\nEntrega: ${quote.deadline} — ${quote.region}\n`;
    if (quote.freight) message += `Frete: ${quote.freight === 'CIF' ? 'CIF (entrega inclusa)' : 'FOB (retira)'}\n`;
    if (quote.paymentTerms) message += `Pagamento: ${quote.paymentTerms}\n`;
    if (quote.observations) message += `Obs: ${quote.observations}\n`;

    message += `\nTem interesse em enviar proposta?\n\n`;

    if (quote.proposalFormUrl) {
      message += `Acesse o formulário:\n`;
      message += `${quote.proposalFormUrl}\n\n`;
      message += `*2* — Não tenho interesse desta vez`;
    } else {
      message += `*1* — Sim, quero participar\n`;
      message += `*2* — Não desta vez`;
    }

    return message;
  },

  ASK_PRICE: `Qual o *preço total* da sua proposta?\n\nEx: 15000`,

  ASK_DELIVERY: `Qual o *prazo de entrega* em dias?\n\nEx: 5`,

  ASK_PAYMENT: `Qual a *condição de pagamento*?\n\nEx: à vista, 30 dias, 50% antecipado`,

  ASK_SUPPLIER_OBS: `Alguma observação sobre sua proposta?\n\nSe não tiver, responda *não*.`,

  PROPOSAL_SENT: `Proposta registrada! ✅\n\nO produtor vai receber junto com as demais. Você será avisado se for selecionado. 🎯`,

  PROPOSAL_SENT_WITH_RANKING: (data: {
    totalProposals: number;
    yourPrice: number;
    expiresIn: string;
  }) =>
    `Proposta enviada! ✅\n\nSua proposta: *R$ ${data.yourPrice.toFixed(2)}*\nTotal recebidas: ${data.totalProposals}\nCotação encerra em: ${data.expiresIn}\n\nVocê será avisado quando o produtor decidir.`,

  PROPOSAL_NOT_SELECTED: (data: {
    winningPrice: number;
    yourPrice: number;
    producerName: string;
  }) => {
    const diff = data.yourPrice - data.winningPrice;
    const diffPercent = ((diff / data.winningPrice) * 100).toFixed(1);

    let message = `A cotação de *${data.producerName}* foi encerrada.\n\n`;
    message += `Desta vez outro fornecedor foi escolhido.\n\n`;
    message += `Vencedor: R$ ${data.winningPrice.toFixed(2)}\n`;
    message += `Sua proposta: R$ ${data.yourPrice.toFixed(2)} (+${diffPercent}%)\n\n`;

    if (diff <= data.winningPrice * 0.05) {
      message += `Você ficou muito próximo! Continue assim.`;
    } else {
      message += `Na próxima, uma proposta mais competitiva pode fazer a diferença.`;
    }

    return message;
  },

  PROPOSAL_SELECTED: (data: { producerName: string; producerPhone: string }) =>
    `Parabéns! 🎉 *${data.producerName}* escolheu você.\n\nEntre em contato para fechar os detalhes:\n📞 ${data.producerPhone}\n\nBoa negociação! 🤝`,

  PROPOSAL_DECLINED: `Sem problemas, obrigado pelo retorno! 👍`,

  // ===================================
  // REPETIR ÚLTIMA COTAÇÃO
  // ===================================

  REPEAT_LAST_QUOTE: (last: {
    product: string;
    quantity: string;
    unit: string;
    region: string;
    deadline?: string;
  }) => {
    return `Quer repetir sua última cotação?\n\n📦 ${last.product} — ${last.quantity} ${last.unit}\n📍 ${last.region}\n\n1 — Sim, repetir\n2 — Nova cotação`;
  },

  // ===================================
  // MENSAGENS GENÉRICAS
  // ===================================

  UNKNOWN_INPUT: `Não entendi. 🤔\n\nDigite *ajuda* para ver o que posso fazer.`,

  HELP: `*FarmFlow — Ajuda* 📚

*O que você pode fazer:*
• *nova cotação* — Solicitar cotação de insumos
• *fornecedor* — Cadastrar um fornecedor
• *cancelar* — Cancelar o que está fazendo
• *ajuda* — Ver esta mensagem

*Como funciona:*
1. Você descreve o que precisa
2. Envio para seus fornecedores
3. Você recebe as propostas aqui
4. Escolhe a melhor

Dúvidas? Fale com o suporte.`,

  ERROR: `Algo deu errado por aqui. 😔\n\nTente novamente em instantes.`,

  ERROR_WITH_SUGGESTIONS: (userInput: string, suggestions: string[]) => {
    let message = `Não entendi "${userInput}".\n\n`;

    if (suggestions.length > 0) {
      message += `Você quis dizer:\n`;
      suggestions.forEach((suggestion, index) => {
        message += `${index + 1} — ${suggestion}\n`;
      });
      message += `\n`;
    }

    message += `Ou tente digitar novamente.`;
    return message;
  },
};
