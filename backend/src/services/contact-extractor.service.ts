import { openaiService } from './openai.service';
import { ContactData } from '../types';
import { logger } from '../utils/logger';

/**
 * Serviço para extrair dados de contatos compartilhados via WhatsApp
 * Usa OpenAI para interpretar o vCard e extrair informações estruturadas
 */
export class ContactExtractorService {
  /**
   * Extrai dados de um contato a partir do texto do vCard ou mensagem
   */
  async extractContactData(contactText: string): Promise<ContactData | null> {
    try {
      const prompt = `
Você é um assistente que extrai informações de contatos. Analise o texto abaixo e extraia as seguintes informações:
- name: nome completo da pessoa
- phone: número de telefone (com DDI se disponível, formato: +5564999999999)
- company: nome da empresa (se mencionado)
- email: endereço de e-mail (se disponível)

IMPORTANTE:
- Se não encontrar um campo, não o inclua na resposta
- O phone é obrigatório
- Retorne apenas um objeto JSON válido

Texto do contato:
${contactText}

Responda apenas com o JSON, sem explicações.
`.trim();

      const response = await openaiService.interpretMessage(prompt);

      // Tentar parsear o JSON da resposta
      const cleanedResponse = JSON.stringify(response).trim().replace(/```json\n?|\n?```/g, '');
      const extracted = JSON.parse(cleanedResponse) as Partial<ContactData>;

      // Validar dados obrigatórios
      if (!extracted.name || !extracted.phone) {
        logger.warn('Contact extraction missing required fields', { extracted });
        return null;
      }

      // Normalizar telefone (remover espaços, traços, parênteses)
      extracted.phone = this.normalizePhone(extracted.phone);

      logger.info('Contact data extracted successfully', { extracted });
      return extracted as ContactData;
    } catch (error) {
      logger.error('Failed to extract contact data', { error, contactText });
      return null;
    }
  }

  /**
   * Extrai dados de contato de um payload de WhatsApp (formato Twilio/Evolution)
   */
  extractFromWhatsAppPayload(payload: any): ContactData | null {
    try {
      // Formato Twilio/WhatsApp: payload pode conter ProfileName e WaId
      if (payload.ProfileName && payload.WaId) {
        return {
          name: payload.ProfileName,
          phone: this.normalizePhone(payload.WaId),
        };
      }

      // Formato de contato estruturado
      if (payload.contacts && Array.isArray(payload.contacts)) {
        const contact = payload.contacts[0];
        if (contact && contact.name && contact.phones && contact.phones[0]) {
          return {
            name: contact.name,
            phone: this.normalizePhone(contact.phones[0].phone),
            email: contact.emails?.[0]?.email,
            company: contact.org?.company,
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to extract contact from WhatsApp payload', { error });
      return null;
    }
  }

  /**
   * Normaliza número de telefone para formato padrão
   * Remove caracteres especiais e garante que começa com +
   */
  private normalizePhone(phone: string): string {
    // Remove tudo exceto números e +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Se não começa com +, adiciona +55 (Brasil) como padrão
    if (!normalized.startsWith('+')) {
      // Se já tem 55 no início (código do Brasil)
      if (normalized.startsWith('55')) {
        normalized = '+' + normalized;
      } else {
        normalized = '+55' + normalized;
      }
    }

    return normalized;
  }

  /**
   * Detecta se uma mensagem contém um vCard (formato de contato)
   */
  isVCard(message: string): boolean {
    return message.includes('BEGIN:VCARD') || message.includes('FN:') || message.includes('TEL:');
  }

  /**
   * Extrai dados de um vCard formatado
   */
  extractFromVCard(vcard: string): ContactData | null {
    try {
      const lines = vcard.split('\n');
      const data: Partial<ContactData> = {};

      for (const line of lines) {
        if (line.startsWith('FN:')) {
          data.name = line.substring(3).trim();
        } else if (line.startsWith('TEL:') || line.startsWith('TEL;')) {
          const phone = line.split(':')[1]?.trim();
          if (phone) {
            data.phone = this.normalizePhone(phone);
          }
        } else if (line.startsWith('EMAIL:') || line.startsWith('EMAIL;')) {
          data.email = line.split(':')[1]?.trim();
        } else if (line.startsWith('ORG:')) {
          data.company = line.substring(4).trim();
        }
      }

      if (data.name && data.phone) {
        return data as ContactData;
      }

      return null;
    } catch (error) {
      logger.error('Failed to parse vCard', { error });
      return null;
    }
  }
}

export const contactExtractorService = new ContactExtractorService();
