/**
 * Templates de mensagens em português do Brasil
 * Todas as mensagens do bot com formatação e emojis
 */

export const Messages = {
  // ===================================
  // MENSAGENS DO PRODUTOR
  // ===================================

  WELCOME: `Olá! 👋 Bem-vindo ao *CotaAgro*!

Sou seu assistente de cotações de insumos agrícolas.

Para começar, envie:
• *1* ou *nova cotação* - Solicitar cotação
• *2* ou *cadastrar fornecedor* - Adicionar fornecedor
• *ajuda* - Ver instruções

Como posso ajudar?`,

  START_QUOTE: `Ótimo! Vamos criar sua cotação. 📋

*Qual produto você deseja cotar?*

Exemplos: soja, milho, fertilizante, defensivo, semente`,

  ASK_QUANTITY: (product: string) => `Perfeito! Você quer cotar *${product}*. ✅

*Qual a quantidade desejada?*

Exemplos: 100 sacos, 500 kg, 20 litros`,

  ASK_REGION: `Entendido! 📦

*Qual a região/cidade de entrega?*

Exemplo: Goiânia, Rio Verde, Jataí`,

  ASK_DEADLINE: `Certo! 📍

*Qual o prazo desejado para entrega?*

Exemplos:
• amanhã
• em 5 dias
• 30/03/2024`,

  ASK_OBSERVATIONS: `Perfeito! ⏰

*Alguma observação adicional?*

Exemplo: preferência de marca, forma de pagamento

Digite *não* se não houver observações.`,

  ASK_SUPPLIER_SCOPE: `Entendido! 📝

*Para quais fornecedores deseja enviar a cotação?*

*1* - Apenas meus fornecedores
*2* - Apenas rede CotaAgro
*3* - Todos (meus + rede)

Digite o número da opção:`,

  CONFIRM_QUOTE: (summary: {
    product: string;
    quantity: string;
    unit: string;
    region: string;
    deadline: string;
    observations?: string;
    scope: string;
  }) => `Confirme os dados da sua cotação: ✅

📦 *Produto:* ${summary.product}
📊 *Quantidade:* ${summary.quantity} ${summary.unit}
📍 *Região:* ${summary.region}
⏰ *Prazo:* ${summary.deadline}
${summary.observations ? `📝 *Obs:* ${summary.observations}` : ''}
🎯 *Fornecedores:* ${summary.scope}

Está correto?
• Digite *sim* para confirmar
• Digite *corrigir* para alterar algum campo`,

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
    product: string;
    quantity: string;
    unit: string;
    region: string;
    deadline: string;
    observations?: string;
  }) => `🔔 *Nova Cotação Disponível*

*ID:* ${quote.id.substring(0, 8)}
📦 *Produto:* ${quote.product}
📊 *Quantidade:* ${quote.quantity} ${quote.unit}
📍 *Região:* ${quote.region}
⏰ *Prazo:* ${quote.deadline}
${quote.observations ? `📝 *Obs:* ${quote.observations}` : ''}

Deseja responder?
*1* - Sim, quero enviar proposta
*2* - Não tenho interesse`,

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
};
