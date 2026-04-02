import OpenAI from 'openai';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { NLUResult } from '../types';

/**
 * Serviço de integração com OpenAI para interpretação de linguagem natural (NLU)
 * Usa GPT-4o para extrair intenções e entidades de mensagens do WhatsApp
 */
export class OpenAIService {
  private client: OpenAI | null = null;

  constructor() {
    if (env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
    } else {
      logger.warn('OpenAI API key not configured. Using fallback regex-based NLU.');
    }
  }

  /**
   * Sugere correções para entrada inválida usando GPT-4
   */
  async suggestCorrections(
    userInput: string,
    expectedType: 'product' | 'quantity' | 'region' | 'deadline',
    context?: string
  ): Promise<string[]> {
    // Se OpenAI não estiver configurada, retornar array vazio
    if (!this.client) {
      return [];
    }

    try {
      const systemPrompt = `Você é um assistente que sugere correções para entradas de usuários em um sistema de cotação agrícola.
O usuário digitou algo que não foi compreendido. Sugira até 3 correções plausíveis.

Tipo de entrada esperada: ${expectedType}
${context ? `Contexto: ${context}` : ''}

Para produtos: sugira insumos agrícolas comuns (ração, soja, milho, fertilizante, defensivo)
Para quantidade: sugira formatos corretos (100 sacas, 500 kg)
Para região: sugira cidades/regiões do Brasil
Para prazo: sugira formatos corretos (amanhã, em 5 dias, 30/03/2024)

Retorne APENAS um array JSON com 3 sugestões de string, sem texto adicional.
Exemplo: ["Ração para gado", "Ração para aves", "Fertilizante NPK"]`;

      const response = await this.client.chat.completions.create(
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `O usuário digitou: "${userInput}". Sugira 3 correções.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 150,
        },
        {
          timeout: 3000, // 3s timeout para não aumentar latência
        }
      );

      const content = response.choices[0]?.message?.content || '[]';

      // Parse do JSON
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const suggestions = JSON.parse(cleaned);

      return Array.isArray(suggestions) ? suggestions.slice(0, 3) : [];
    } catch (error) {
      logger.error('Failed to suggest corrections', { error, userInput, expectedType });
      return [];
    }
  }

  /**
   * Interpreta mensagem do usuário e extrai intenção + entidades
   */
  async interpretMessage(message: string, context?: string): Promise<NLUResult> {
    // Se OpenAI não estiver configurada, usa fallback
    if (!this.client) {
      return this.fallbackInterpretation(message);
    }

    try {
      const systemPrompt = `Você é um assistente especializado em interpretar mensagens de produtores rurais brasileiros que desejam cotar insumos agrícolas.

Sua tarefa é analisar a mensagem e retornar um JSON com:
- intent: tipo de intenção (nova_cotacao, ver_cotacao, cancelar, saudacao, ajuda, responder_cotacao, recusar_cotacao, desconhecido)
- entities: entidades extraídas (product, quantity, unit, region, deadline)
- confidence: confiança de 0 a 1

Exemplos de mensagens:
- "quero cotar 100 sacos de soja para Goiânia em 5 dias" → intent: nova_cotacao, entities: {product: "soja", quantity: "100", unit: "sacos", region: "Goiânia", deadline: "em 5 dias"}
- "preciso de 500kg de fertilizante" → intent: nova_cotacao, entities: {product: "fertilizante", quantity: "500", unit: "kg"}
- "oi, bom dia" → intent: saudacao, entities: {}
- "cancelar" → intent: cancelar, entities: {}

${context ? `Contexto da conversa: ${context}` : ''}

Retorne APENAS o JSON, sem texto adicional.`;

      const response = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message.content;
      if (!content) {
        logger.warn('OpenAI returned empty response');
        return this.fallbackInterpretation(message);
      }

      const result = JSON.parse(content) as NLUResult;
      logger.info('OpenAI NLU successful', { message, result });
      return result;
    } catch (error) {
      logger.error('OpenAI NLU error, falling back to regex', { error });
      return this.fallbackInterpretation(message);
    }
  }

  /**
   * Interpretação fallback usando regex simples
   * Usado quando OpenAI não está disponível
   */
  private fallbackInterpretation(message: string): NLUResult {
    const normalized = message.toLowerCase().trim();

    // Saudações
    if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|e aí|eai)/.test(normalized)) {
      return { intent: 'saudacao', entities: {}, confidence: 0.9 };
    }

    // Ajuda
    if (/\b(ajuda|help|socorro|como|tutorial)\b/.test(normalized)) {
      return { intent: 'ajuda', entities: {}, confidence: 0.8 };
    }

    // Cancelar
    if (/^(cancelar|cancela|parar|para|sair)/.test(normalized)) {
      return { intent: 'cancelar', entities: {}, confidence: 0.9 };
    }

    // Ver cotação
    if (/\b(ver|consultar|status|andamento) (cotação|cotacao)\b/.test(normalized)) {
      return { intent: 'ver_cotacao', entities: {}, confidence: 0.7 };
    }

    // Nova cotação (keywords de produtos agrícolas)
    const productKeywords = [
      'soja',
      'milho',
      'fertilizante',
      'semente',
      'defensivo',
      'adubo',
      'herbicida',
      'inseticida',
      'calcário',
      'ureia',
    ];

    const hasProduct = productKeywords.some((keyword) => normalized.includes(keyword));
    const hasCotationKeyword = /\b(cotar|cotação|cotacao|preciso|quero|orçamento)\b/.test(
      normalized
    );

    if (hasProduct || hasCotationKeyword) {
      const entities: NLUResult['entities'] = {};

      // Extrair produto
      for (const keyword of productKeywords) {
        if (normalized.includes(keyword)) {
          entities.product = keyword;
          break;
        }
      }

      // Extrair quantidade (ex: 100 sacos, 500kg, 20 litros)
      const quantityMatch = normalized.match(/(\d+)\s*(sacos?|kg|litros?|toneladas?|ton?|l)/);
      if (quantityMatch) {
        entities.quantity = quantityMatch[1];
        entities.unit = quantityMatch[2];
      }

      // Extrair região (cidades conhecidas)
      const regions = ['goiânia', 'goiania', 'rio verde', 'jataí', 'jatai', 'brasília', 'brasilia'];
      for (const region of regions) {
        if (normalized.includes(region)) {
          entities.region = region;
          break;
        }
      }

      // Extrair deadline
      const deadlineMatch = normalized.match(/em\s+(\d+)\s+dias?|daqui\s+a\s+(\d+)\s+dias?/);
      if (deadlineMatch) {
        const days = deadlineMatch[1] || deadlineMatch[2];
        entities.deadline = `em ${days} dias`;
      }

      return {
        intent: 'nova_cotacao',
        entities,
        confidence: hasProduct && hasCotationKeyword ? 0.8 : 0.6,
      };
    }

    // Desconhecido
    return { intent: 'desconhecido', entities: {}, confidence: 0.5 };
  }
}

// Singleton
export const openaiService = new OpenAIService();
