# CotaAgro WhatsApp - Product Backlog

**Product Owner:** Claude Opus 4.6  
**Data:** 02/04/2026  
**Última Atualização:** Após implementação P1 (Quick Wins)  
**Score Atual:** 7/10 (era 6/10 antes do P1)  
**Meta:** 9/10 em 6 meses

---

## 📊 Status Atual Pós-P1

### ✅ Implementado (P1 - Quick Wins)
- **P1.1** - Onboarding Personalizado ✅
- **P1.2** - NLU Full Flow (proof of concept em AWAITING_PRODUCT) ✅
- **P1.3** - Indicadores de Progresso ✅
- **P1.4** - Botões Nativos WhatsApp MVP ✅

**Impacto Esperado do P1:**
- Taxa de conclusão: 30% → 50% (+67%)
- Tempo médio: 5min → 2-3min (-40 a -60%)
- Taxa de primeira resposta: 40% → 70% (+75%)

### 🎯 Próximas Prioridades
Com P1 implementado, focar em:
1. **P2 (Sprint 1-2):** Otimizações - Memória, Erros Inteligentes, Feedback Loop
2. **P3 (Sprint 3-4):** Inovações - Voz, Foto, Preditiva
3. **P4 (Sprint 5-6):** Instrumentação e Analytics

---

## 🗂️ Backlog Priorizado

---

## Epic 1: Otimização de Conversão (P2) 🟡
**Objetivo:** Aumentar taxa de conclusão de 50% → 65%  
**Esforço Total:** 3-4 semanas  
**Prioridade:** Alta  
**Sprint:** 1-2

---

### 🎯 User Story 1.1: Memória de Cotações Anteriores
**Como** produtor recorrente  
**Quero** repetir minha última cotação com um clique  
**Para que** eu economize tempo e não precise digitar tudo novamente

**Valor de Negócio:** 🔥🔥🔥 Alto
- Aumenta retenção (+25% estimado)
- Reduz tempo de 5min → 30s para usuários frequentes
- Aumenta stickiness (usuários voltam mais)

**Critérios de Aceitação:**
- [ ] Sistema salva últimas 5 cotações do produtor (product, quantity, unit, region, deadline)
- [ ] Ao iniciar nova cotação, bot pergunta: "Repetir última cotação?"
- [ ] Mostra resumo da última cotação com botões [Sim, repetir] [Nova cotação]
- [ ] Se usuário escolher "Sim", pula direto para confirmação (AWAITING_CONFIRMATION)
- [ ] Se usuário escolher "Nova", inicia fluxo normal
- [ ] Detecta padrões (ex: "você cotou ração 8 vezes nos últimos 30 dias")
- [ ] Sugere cotação recorrente se detectar padrão

**Dependências Técnicas:**
- Adicionar campo `lastQuotePreferences` (JSON) no model `Producer`
- Criar método `saveQuotePreferences()` após criar Quote
- Criar método `getLastQuotePreferences()` no início do fluxo
- Adicionar lógica de detecção de padrão (query de frequência)

**Esforço:** 5 pontos (1 semana)

**Arquivos Impactados:**
- `backend/prisma/schema.prisma` - adicionar campo
- `backend/src/flows/producer.flow.ts` - método handleIdle
- `backend/src/flows/messages.ts` - novas mensagens

**DoD (Definition of Done):**
- [ ] Campo adicionado no schema e migration criada
- [ ] Testes unitários para saveQuotePreferences()
- [ ] Testes unitários para getLastQuotePreferences()
- [ ] Testes E2E do fluxo de repetição
- [ ] Documentação atualizada

**Riscos:**
- ⚠️ Preferências podem ficar desatualizadas (ex: fornecedor mudou)
- ⚠️ Usuário pode querer editar antes de repetir
- Mitigação: Sempre mostrar resumo e pedir confirmação

---

### 🎯 User Story 1.2: Tratamento de Erros Inteligente
**Como** produtor iniciante  
**Quero** receber sugestões quando erro ao digitar  
**Para que** eu não abandone a cotação por frustração

**Valor de Negócio:** 🔥🔥 Médio-Alto
- Reduz abandono por erro (-50% estimado)
- Melhora experiência para usuários novos
- Reduz suporte manual

**Critérios de Aceitação:**
- [ ] Quando validação falhar (ex: "rcao"), GPT-4 sugere correções
- [ ] Mostra até 3 sugestões com botões numéricos
- [ ] Permite usuário digitar novamente se sugestões não ajudarem
- [ ] Implementar em: AWAITING_PRODUCT, AWAITING_QUANTITY, AWAITING_REGION, AWAITING_DEADLINE
- [ ] Log de erros para análise posterior

**Exemplo:**
```
❌ Não entendi "rcao".

Você quis dizer:
1️⃣ Ração para gado
2️⃣ Ração para aves
3️⃣ Outro produto

Ou digite novamente:
```

**Dependências Técnicas:**
- Criar método `suggestCorrections()` no `openaiService`
- Adicionar fallback para erro comum (fuzzy matching local)
- Criar banco de produtos mais cotados para sugestões rápidas
- Adicionar timeout curto (3s) para não aumentar latência

**Esforço:** 3 pontos (3-4 dias)

**Arquivos Impactados:**
- `backend/src/services/openai.service.ts` - novo método
- `backend/src/flows/producer.flow.ts` - handlers de erro
- `backend/src/flows/messages.ts` - mensagens de erro

**DoD:**
- [ ] Método suggestCorrections() implementado
- [ ] Cache de sugestões no Redis (TTL 1h)
- [ ] Testes com typos comuns
- [ ] Timeout e fallback funcionando
- [ ] Métricas de erro logadas

**Custos:**
- ⚠️ +$0.02 por erro (chamada GPT-4 extra)
- Estimativa: 20% dos usuários erram 1x → +$0.004 por cotação em média

---

### 🎯 User Story 1.3: Feedback Loop para Fornecedores
**Como** fornecedor  
**Quero** saber o status da minha proposta em tempo real  
**Para que** eu possa ajustar minha estratégia de precificação

**Valor de Negócio:** 🔥🔥🔥 Alto
- Aumenta engajamento de fornecedores (+40%)
- Melhora qualidade das propostas (preços mais competitivos)
- Reduz reclamações de "não sei se fui selecionado"

**Critérios de Aceitação:**
- [ ] Após enviar proposta, mostrar ranking em tempo real
- [ ] Notificar quando outra proposta chegar ("você está em 2º lugar agora")
- [ ] Ao fechar cotação, notificar vencedores E perdedores
- [ ] Para perdedores, mostrar: preço vencedor, diferença, dica de melhoria
- [ ] Permitir fornecedor ajustar proposta se ainda não fechou (opcional)

**Exemplo - Após Enviar:**
```
✅ Proposta enviada!

Status:
🟢 Recebida pelo produtor
⏳ Aguardando decisão (expira em 45min)

Ranking atual:
👥 3 propostas enviadas
💰 Sua proposta: R$ 9.000
📊 Menor proposta: R$ 8.500 ⚠️

[Ver ranking] [Ajustar proposta]
```

**Exemplo - Perdedor:**
```
❌ Não foi desta vez!

Feedback:
• Proposta selecionada: R$ 8.500
• Sua proposta: R$ 9.000
• Diferença: R$ 500 (5.5% mais cara)

💡 Dica: Reduza 6% para ser competitivo na próxima
```

**Dependências Técnicas:**
- Criar sistema de notificações em tempo real (webhook ou polling)
- Adicionar campo `currentRanking` calculado dinamicamente
- Criar job que notifica fornecedores quando novo ranking
- Adicionar evento `onProposalUpdated` na FSM

**Esforço:** 8 pontos (1.5 semanas)

**Arquivos Impactados:**
- `backend/src/flows/supplier.flow.ts` - novos estados
- `backend/src/modules/whatsapp/whatsapp.service.ts` - webhooks
- `backend/src/jobs/notify-suppliers.job.ts` - NOVO arquivo
- `backend/src/flows/messages.ts` - novas mensagens

**DoD:**
- [ ] Ranking calculado corretamente
- [ ] Notificações enviadas em tempo real
- [ ] Feedback pós-fechamento funcionando
- [ ] Testes de ranking com múltiplas propostas
- [ ] Métricas de engajamento instrumentadas

**Riscos:**
- ⚠️ Muitas notificações podem virar spam
- Mitigação: Limitar 1 notificação a cada 10 minutos
- ⚠️ Fornecedor pode ficar frustrado se sempre perder
- Mitigação: Dicas construtivas, não apenas "você perdeu"

---

### 🎯 User Story 1.4: Tornar Observações Opcionais
**Como** produtor  
**Quero** pular a pergunta de observações se não tenho nada a adicionar  
**Para que** eu economize 1 mensagem (90% das vezes não tenho observações)

**Valor de Negócio:** 🔥 Baixo-Médio
- Reduz 1 mensagem em 90% dos casos
- Pequeno impacto mas fácil de implementar (Quick Win)

**Critérios de Aceitação:**
- [ ] Após AWAITING_DEADLINE, ir direto para AWAITING_SUPPLIER_SCOPE
- [ ] Mostrar mensagem: "Se precisar adicionar observações, digite agora. Caso contrário, confirme."
- [ ] Botões: [Continuar sem observações] [Adicionar observação]
- [ ] Se usuário digitar texto livre, capturar como observação

**Dependências Técnicas:**
- Modificar fluxo para pular AWAITING_OBSERVATIONS
- Adicionar lógica de captura opcional de observações
- Atualizar mensagem de confirmação para incluir opção

**Esforço:** 2 pontos (1-2 dias)

**Arquivos Impactados:**
- `backend/src/flows/producer.flow.ts` - handleAwaitingDeadline
- `backend/src/flows/messages.ts` - ASK_DEADLINE

**DoD:**
- [ ] Fluxo funciona sem perguntar observações
- [ ] Usuário pode adicionar observações se quiser
- [ ] Testes de ambos os cenários
- [ ] Atualização de documentação

---

### 🎯 User Story 1.5: Simplificar Seleção de Fornecedores
**Como** produtor  
**Quero** ver rating e histórico de cada fornecedor ao selecionar  
**Para que** eu tome uma decisão informada sobre quem incluir na cotação

**Valor de Negócio:** 🔥🔥 Médio
- Melhora tomada de decisão
- Aumenta confiança no sistema
- Reduz 4 mensagens → 2 mensagens

**Critérios de Aceitação:**
- [ ] Lista de fornecedores mostra: nome, rating (⭐), última cotação, última compra
- [ ] Botões: [Enviar para todos] [Escolher fornecedores]
- [ ] Se escolher "Escolher", permitir selecionar/desselecionar com números
- [ ] Simplificar fluxo de exclusão (remover confirmação extra)

**Exemplo:**
```
📋 Seus Fornecedores (3 encontrados)

✅ 1. AgroTech ⭐ 4.8 | Última: R$ 85/saca (28/02)
✅ 2. Ração Master ⭐ 4.5 | Última: R$ 90/saca (15/03)
✅ 3. João Insumos | Novo fornecedor

[Enviar para todos] [Escolher]
```

**Dependências Técnicas:**
- Adicionar campo `rating` no model Supplier
- Criar query para buscar histórico de preços
- Criar query para última transação
- Calcular rating baseado em: propostas aceitas, feedback

**Esforço:** 5 pontos (1 semana)

**Arquivos Impactados:**
- `backend/prisma/schema.prisma` - campo rating
- `backend/src/flows/producer.flow.ts` - showSupplierListForSelection
- `backend/src/flows/messages.ts` - mensagem de seleção

**DoD:**
- [ ] Rating calculado e salvo
- [ ] Histórico de preços buscado
- [ ] Mensagem exibe informações
- [ ] Testes com fornecedores novos e antigos
- [ ] Performance OK (query otimizada)

---

## Epic 2: Inovações (P3) 🟢
**Objetivo:** Diferenciar da concorrência  
**Esforço Total:** 4-6 semanas  
**Prioridade:** Média  
**Sprint:** 3-4

---

### 🎯 User Story 2.1: Cotação por Voz
**Como** produtor rural  
**Quero** enviar uma mensagem de voz ao invés de digitar  
**Para que** eu economize tempo (digitar é lento no celular)

**Valor de Negócio:** 🔥🔥🔥 Alto
- Público rural prefere áudio (+30% adesão estimado)
- Reduz barreira de entrada (literacia digital)
- Diferencial competitivo

**Critérios de Aceitação:**
- [ ] Sistema aceita mensagens de voz do WhatsApp
- [ ] Usa Whisper API (OpenAI) para transcrever áudio
- [ ] GPT-4 extrai entidades do texto transcrito
- [ ] Funciona em qualquer estado do fluxo
- [ ] Feedback visual: "Ouvindo... [barra de progresso]"

**Exemplo:**
```
Produtor: [envia áudio] "Quero 100 sacas de ração, entrega Rio Verde, até sexta"

Bot: 🎙️ Transcrevi: "100 sacas de ração, Rio Verde, até sexta"

✅ Entendi:
📦 Produto: ração
📊 Quantidade: 100 sacas
📍 Região: Rio Verde
⏰ Prazo: 05/04

Está correto?
```

**Dependências Técnicas:**
- Integrar Whisper API (OpenAI)
- Adicionar handler para mensagem tipo "audio"
- Reutilizar NLUExtractorService para extrair entidades
- Adicionar tratamento de erro (áudio incompreensível)

**Esforço:** 8 pontos (1.5 semanas)

**Arquivos Impactados:**
- `backend/src/modules/whatsapp/whatsapp.service.ts` - novo handler
- `backend/src/services/openai.service.ts` - método transcribeAudio()
- `backend/src/flows/producer.flow.ts` - aceitar input de áudio

**DoD:**
- [ ] Whisper API integrada
- [ ] Transcrição funciona com sotaques brasileiros
- [ ] Extração de entidades funciona
- [ ] Tratamento de erro (áudio ruim)
- [ ] Testes com áudios reais

**Custos:**
- ⚠️ Whisper API: $0.006 por minuto de áudio
- Estimativa: Áudio médio 30s → $0.003 por cotação

**Riscos:**
- ⚠️ Sotaque regional pode dificultar transcrição
- Mitigação: Treinar modelo ou usar fallback
- ⚠️ Ruído de fundo (fazenda, trator)
- Mitigação: Pedir confirmação visual da transcrição

---

### 🎯 User Story 2.2: Cotação por Foto
**Como** produtor  
**Quero** fotografar minha última nota fiscal  
**Para que** o sistema extraia os dados automaticamente

**Valor de Negócio:** 🔥🔥 Médio-Alto
- Reduz digitação em 100%
- UX "mágica" (impressiona usuário)
- Reutiliza dados de compras anteriores

**Critérios de Aceitação:**
- [ ] Sistema aceita imagem (foto de nota fiscal)
- [ ] Usa GPT-4 Vision para extrair: produto, quantidade, preço, fornecedor
- [ ] Pré-preenche campos da cotação
- [ ] Pede confirmação antes de enviar
- [ ] Funciona com nota fiscal, embalagem, ou recibo

**Exemplo:**
```
Produtor: [envia foto da nota fiscal]

Bot: 📷 Analisando nota fiscal...

✅ Extraí os seguintes dados:
📦 Produto: Ração XYZ Marca
📊 Quantidade: 100 sacas
💰 Preço anterior: R$ 90/saca
🏢 Fornecedor: AgroTech

Quer cotar o mesmo produto?
[Sim, mesma quantidade] [Sim, mas alterar quantidade] [Nova cotação]
```

**Dependências Técnicas:**
- Integrar GPT-4 Vision API
- Adicionar handler para mensagem tipo "image"
- Criar prompt de extração de NF (campos estruturados)
- Validar campos extraídos antes de usar

**Esforço:** 8 pontos (1.5 semanas)

**Arquivos Impactados:**
- `backend/src/services/openai.service.ts` - método analyzeImage()
- `backend/src/modules/whatsapp/whatsapp.service.ts` - handler de imagem
- `backend/src/flows/producer.flow.ts` - pré-preencher contexto

**DoD:**
- [ ] GPT-4 Vision integrada
- [ ] Extração funciona com NFs reais
- [ ] Validação de campos extraídos
- [ ] Testes com fotos de diferentes qualidades
- [ ] Fallback se não conseguir extrair

**Custos:**
- ⚠️ GPT-4 Vision: $0.01 por imagem (1024x1024)
- Estimativa: 20% dos usuários usam foto → +$0.002 por cotação em média

---

### 🎯 User Story 2.3: Inteligência Preditiva
**Como** sistema  
**Quero** prever quando o produtor vai precisar cotar  
**Para que** eu possa sugerir proativamente

**Valor de Negócio:** 🔥🔥🔥 Alto
- Aumenta engajamento (+20%)
- Reduz esforço do usuário (-50%)
- Aumenta frequência de uso

**Critérios de Aceitação:**
- [ ] Sistema detecta padrões de cotação (dia do mês, frequência, produto)
- [ ] Envia notificação proativa: "João, percebi que você costuma cotar ração todo início de mês. Quer que eu prepare uma cotação?"
- [ ] Oferece criar cotação recorrente automática
- [ ] Usuário pode desativar notificações

**Exemplo:**
```
Bot (notificação proativa):
💡 Oi João!

Percebi um padrão:
• Você cotou ração 8 vezes nos últimos 60 dias
• Sempre entre dia 1-5 do mês
• Sempre 100 sacas

Hoje é dia 3. Quer que eu prepare uma cotação agora?
[Sim, cotar agora] [Não, depois] [Criar cotação recorrente]
```

**Dependências Técnicas:**
- Criar modelo ML de previsão (ou regras simples)
- Criar job que roda diariamente analisando padrões
- Adicionar campo `preferences.notifications` no Producer
- Implementar envio de notificação proativa via WhatsApp

**Esforço:** 13 pontos (2-3 semanas)

**Arquivos Impactados:**
- `backend/src/ml/pattern-detection.service.ts` - NOVO
- `backend/src/jobs/proactive-quotes.job.ts` - NOVO
- `backend/prisma/schema.prisma` - campo preferences
- `backend/src/modules/whatsapp/whatsapp.service.ts` - notificação proativa

**DoD:**
- [ ] Padrões detectados corretamente
- [ ] Notificações enviadas no momento certo
- [ ] Taxa de falso positivo < 10%
- [ ] Usuário pode desativar facilmente
- [ ] Métricas de engajamento

**Riscos:**
- ⚠️ Notificações podem virar spam
- Mitigação: Máximo 1 notificação proativa por semana
- ⚠️ Previsão errada frustra usuário
- Mitigação: Tom suave "percebi um padrão", não "você DEVE cotar"

---

## Epic 3: Instrumentação e Analytics (P4) 📊
**Objetivo:** Medir impacto e tomar decisões baseadas em dados  
**Esforço Total:** 2-3 semanas  
**Prioridade:** Alta (fundacional)  
**Sprint:** Paralelo aos outros

---

### 🎯 User Story 3.1: Métricas de Conversação
**Como** Product Owner  
**Quero** ver dashboards de conversão em tempo real  
**Para que** eu saiba quais melhorias estão funcionando

**Valor de Negócio:** 🔥🔥🔥🔥 Crítico
- Fundamenta decisões de produto
- Identifica gargalos rapidamente
- ROI mensurável de cada melhoria

**Critérios de Aceitação:**
- [ ] Criar tabela `ConversationMetric` no Prisma
- [ ] Adicionar eventos: message_sent, message_received, state_changed, error, quote_completed
- [ ] Dashboard Grafana/Metabase com:
  - Taxa de primeira resposta por dia
  - Funil de conversão por estado
  - Tempo médio por estado
  - Taxa de erro por tipo
  - Abandono por estado
- [ ] Alertas se taxa de erro > 5%

**Dependências Técnicas:**
- Criar model ConversationMetric
- Adicionar método trackMetric() na FSM
- Configurar Grafana/Metabase
- Criar dashboards

**Esforço:** 5 pontos (1 semana)

**Arquivos Impactados:**
- `backend/prisma/schema.prisma` - novo model
- `backend/src/flows/producer.flow.ts` - chamadas trackMetric()
- `backend/src/services/metrics.service.ts` - NOVO

**DoD:**
- [ ] Tabela criada e migration rodada
- [ ] Eventos sendo logados
- [ ] Dashboard funcional
- [ ] Alertas configurados
- [ ] Documentação de métricas

---

### 🎯 User Story 3.2: Testes A/B
**Como** Product Owner  
**Quero** rodar testes A/B de diferentes abordagens  
**Para que** eu valide hipóteses antes de lançar para todos

**Valor de Negócio:** 🔥🔥🔥 Alto
- Reduz risco de mudanças
- Valida hipóteses com dados
- Permite experimentação contínua

**Critérios de Aceitação:**
- [ ] Criar sistema de feature flags (ex: LaunchDarkly ou custom)
- [ ] Dividir usuários em grupos A/B (50/50 ou 80/20)
- [ ] Medir métricas por grupo
- [ ] Calcular significância estatística automaticamente
- [ ] Interface para ativar/desativar features

**Exemplo de Teste:**
```
Hipótese: Onboarding com vídeo aumenta conversão
Grupo A: Onboarding atual (texto)
Grupo B: Onboarding com link para vídeo de 30s
Métrica: Taxa de primeira cotação
Duração: 2 semanas
```

**Dependências Técnicas:**
- Integrar sistema de feature flags
- Adicionar lógica de divisão de grupos
- Garantir randomização justa
- Criar dashboard de comparação

**Esforço:** 8 pontos (1.5 semanas)

**Arquivos Impactados:**
- `backend/src/config/feature-flags.ts` - NOVO
- `backend/src/flows/producer.flow.ts` - checks de feature flag
- Dashboard externo (LaunchDarkly ou custom)

**DoD:**
- [ ] Feature flags funcionando
- [ ] Divisão de grupos justa
- [ ] Métricas por grupo
- [ ] Cálculo de significância
- [ ] Documentação de testes

---

## Roadmap Sugerido (6 meses)

### Q2 2026 (Abril - Junho)

**Sprint 1-2 (Abril - Maio): Epic 1 - Otimizações**
- Semana 1-2: US 1.1 (Memória de cotações) + US 1.4 (Observações opcionais)
- Semana 3-4: US 1.2 (Erros inteligentes) + US 1.5 (Seleção de fornecedores)
- Semana 5-6: US 1.3 (Feedback loop fornecedores)
- **Paralelo:** US 3.1 (Métricas) - infraestrutura

**Sprint 3-4 (Maio - Junho): Epic 2 - Inovações**
- Semana 7-8: US 2.1 (Cotação por voz)
- Semana 9-10: US 2.2 (Cotação por foto)
- Semana 11-12: US 2.3 (Inteligência preditiva) - fase 1
- **Paralelo:** US 3.2 (Testes A/B) - infraestrutura

### Q3 2026 (Julho - Setembro)

**Sprint 5-6: Refinamentos e Expansão**
- Aplicar NLU em todos os estados (não só AWAITING_PRODUCT)
- Rich media (gráficos, PDFs)
- Notificações proativas refinadas
- Cotação recorrente automática
- Integração com ERP/Sistemas externos

---

## Métricas de Sucesso

### Baseline Atual (Pós-P1)
```
Produtor:
- Primeira resposta: 70%
- Completion rate: 50%
- Tempo médio: 2-3 minutos
- Mensagens trocadas: 6-8
- Abandono em erro: 10%

Fornecedor:
- Taxa de resposta: 30%
- Tempo de resposta: 30 minutos
- Propostas completas: 70%
```

### Meta Q2 (Pós-Epic 1)
```
Produtor:
- Primeira resposta: 75% (+5%)
- Completion rate: 65% (+30%)
- Tempo médio: 1.5-2 minutos (-25%)
- Mensagens trocadas: 4-5 (-33%)
- Abandono em erro: 3% (-70%)

Fornecedor:
- Taxa de resposta: 60% (+100%)
- Tempo de resposta: 10 minutos (-67%)
- Propostas completas: 90% (+29%)
```

### Meta Q3 (Pós-Epic 2)
```
Produtor:
- Primeira resposta: 80%
- Completion rate: 75%
- Tempo médio: 1 minuto (voz) ou 1.5 min (texto)
- Mensagens trocadas: 3-4
- Abandono em erro: 1%
- Uso de voz: 30% dos usuários
- Uso de foto: 20% dos usuários

Fornecedor:
- Taxa de resposta: 70%
- Tempo de resposta: 5 minutos
- Propostas completas: 95%
- Ajuste de proposta: 15% ajustam antes de fechar
```

### Meta Ano (Score 9/10)
```
- NPS > 60
- Retenção (D30): > 70%
- CAC payback: < 3 meses
- Cotações por usuário/mês: > 8
- Share of wallet: > 60% (% dos insumos comprados via CotaAgro)
```

---

## Estimativas de Esforço

### Por Epic
| Epic | User Stories | Pontos | Semanas | Desenvolvedores |
|------|--------------|--------|---------|-----------------|
| Epic 1 (Otimizações) | 5 | 28 | 5-6 | 2 devs |
| Epic 2 (Inovações) | 3 | 29 | 5-6 | 2 devs |
| Epic 3 (Analytics) | 2 | 13 | 2-3 | 1 dev |
| **Total** | **10** | **70** | **12-15** | **2-3 devs** |

### Por Sprint
- **Sprint 1-2:** 28 pontos (Epic 1)
- **Sprint 3-4:** 29 pontos (Epic 2)
- **Sprint 5-6:** 13 pontos (Epic 3) + refinamentos

---

## Dependências e Bloqueadores

### Técnicas
- ✅ P1 implementado (desbloqueia todo o resto)
- ⚠️ WhatsApp Business API (para botões nativos reais) - em aprovação
- ⚠️ Whisper API (para voz) - requer OpenAI API key
- ⚠️ GPT-4 Vision (para foto) - requer OpenAI API key

### Negócio
- ⚠️ Budget para APIs OpenAI (~$500-1000/mês)
- ⚠️ Equipe de 2-3 devs disponível
- ⚠️ Acesso a produtores para testes

### Infraestrutura
- ⚠️ Grafana/Metabase configurado
- ⚠️ Redis para cache (já existe)
- ⚠️ Feature flags system

---

## Riscos e Mitigações

### Alto Risco
1. **Custos OpenAI explodem**
   - Mitigação: Cache agressivo, limites por usuário, monitoramento
2. **Usuários não adotam voz/foto**
   - Mitigação: Teste A/B antes de investir pesado
3. **Notificações proativas viram spam**
   - Mitigação: Opt-in, limite 1/semana, fácil de desativar

### Médio Risco
1. **Performance degrada com NLU em todos os estados**
   - Mitigação: Cache, timeout curto, fallback para fluxo linear
2. **Fornecedores frustrados com ranking**
   - Mitigação: Tom positivo, dicas construtivas
3. **Padrões de ML errados**
   - Mitigação: Começar com regras simples, validar com usuários

---

## Critérios de Priorização

Usamos framework **RICE** (Reach, Impact, Confidence, Effort):

| User Story | Reach | Impact | Confidence | Effort | Score |
|------------|-------|--------|------------|--------|-------|
| US 1.1 (Memória) | 60% | 3 | 80% | 5 | 28.8 |
| US 1.2 (Erros) | 80% | 2 | 70% | 3 | 37.3 |
| US 1.3 (Feedback) | 100% | 3 | 90% | 8 | 33.8 |
| US 1.4 (Obs) | 90% | 1 | 100% | 2 | 45.0 |
| US 1.5 (Seleção) | 50% | 2 | 80% | 5 | 16.0 |
| US 2.1 (Voz) | 30% | 3 | 60% | 8 | 6.8 |
| US 2.2 (Foto) | 20% | 3 | 50% | 8 | 3.8 |
| US 2.3 (Preditiva) | 60% | 3 | 40% | 13 | 5.5 |

**Ordem sugerida:** US 1.4 → US 1.2 → US 1.3 → US 1.1 → US 1.5 → US 2.1 → US 2.3 → US 2.2

---

## Próximos Passos Imediatos

1. **Validar Backlog com Stakeholders** (1 semana)
   - Apresentar backlog para time comercial
   - Validar prioridades com dados de uso
   - Aprovar budget de APIs

2. **Planejar Sprint 1** (1 semana)
   - Refinar US 1.4 e US 1.2
   - Criar subtasks técnicas
   - Alocar desenvolvedores
   - Configurar ambiente de métricas

3. **Kickoff Sprint 1** (Dia 08/04/2026)
   - Daily às 9h
   - Review toda sexta
   - Retrospectiva ao final

---

**Prepared by:** Claude Opus 4.6 (Product Owner)  
**Next Review:** 09/04/2026 (após validação com stakeholders)  
**Status:** 📋 Aguardando aprovação para iniciar Sprint 1
