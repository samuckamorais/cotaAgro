import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { OTPService } from '../../services/otp.service';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { createError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

export class AuthService {
  /**
   * Solicita código OTP e envia via WhatsApp
   */
  static async requestOTP(phone: string): Promise<void> {
    // Verificar se produtor existe
    const producer = await prisma.producer.findUnique({ where: { phone } });
    if (!producer) {
      throw createError.notFound('Produtor não encontrado');
    }

    // Verificar se já existe um código ativo
    if (await OTPService.hasActiveCode(phone)) {
      const ttl = await OTPService.getCodeTTL(phone);
      throw createError.badRequest(
        `Código OTP já enviado. Aguarde ${Math.ceil(ttl / 60)} minutos para solicitar novo código.`
      );
    }

    // Gerar e enviar código
    const code = OTPService.generateCode();
    await OTPService.saveCode(phone, code);

    // Enviar via WhatsApp
    await whatsappService.sendMessage({
      to: phone,
      body: `🔐 Seu código de verificação CotaAgro: *${code}*\n\nVálido por 10 minutos.`,
    });

    logger.info('OTP sent', { phone });
  }

  /**
   * Valida código OTP e retorna JWT token
   */
  static async validateOTP(phone: string, code: string): Promise<string> {
    const isValid = await OTPService.validateCode(phone, code);

    if (!isValid) {
      throw createError.unauthorized('Código inválido ou expirado');
    }

    // Buscar produtor
    const producer = await prisma.producer.findUnique({ where: { phone } });
    if (!producer) {
      throw createError.notFound('Produtor não encontrado');
    }

    // Gerar JWT token
    const token = jwt.sign({ userId: producer.id, phone: producer.phone }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}` | number,
    });

    logger.info('User authenticated', { userId: producer.id });

    return token;
  }
}
