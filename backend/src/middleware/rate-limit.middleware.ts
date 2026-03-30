import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { createError } from '../utils/error-handler';
import { logger } from '../utils/logger';

/**
 * Rate limiter customizado baseado em número de telefone
 * Armazena contadores no Redis com TTL de 1 minuto
 */
export const rateLimitByPhone = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const phone = req.body.from || req.body.phone;

    if (!phone) {
      // Se não houver telefone, pula rate limiting
      return next();
    }

    const key = `rate_limit:${phone}`;
    const limit = env.MAX_MESSAGES_PER_PHONE_PER_MINUTE;

    // Incrementa contador
    const count = await redis.incr(key);

    // Define TTL na primeira requisição
    if (count === 1) {
      await redis.expire(key, 60); // 60 segundos
    }

    // Verifica se excedeu limite
    if (count > limit) {
      logger.warn(`Rate limit exceeded for phone ${phone}`, {
        phone,
        count,
        limit,
      });

      throw createError.badRequest(
        `Limite de ${limit} mensagens por minuto excedido. Aguarde alguns instantes.`
      );
    }

    // Adiciona headers de rate limit
    const ttl = await redis.ttl(key);
    _res.setHeader('X-RateLimit-Limit', limit);
    _res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
    _res.setHeader('X-RateLimit-Reset', Date.now() + ttl * 1000);

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Rate limiter global por IP (Express-rate-limit padrão)
 */
import rateLimit from 'express-rate-limit';

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas requisições deste IP. Tente novamente mais tarde.',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
