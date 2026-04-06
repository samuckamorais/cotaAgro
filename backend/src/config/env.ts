import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Server
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // WhatsApp Provider
  WHATSAPP_PROVIDER: z.enum(['twilio', 'evolution']).default('twilio'),

  // Twilio (optional if using Evolution API)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),

  // Evolution API (optional if using Twilio)
  EVOLUTION_API_URL: z.preprocess(val => (typeof val === 'string' && val.trim() === '') ? undefined : val, z.string().url().optional()),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE_NAME: z.string().optional(),

  // Webhook
  WEBHOOK_URL: z.preprocess(val => (typeof val === 'string' && val.trim() === '') ? undefined : val, z.string().url().optional()),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(), // optional para permitir mock
  OPENAI_MODEL: z.string().default('gpt-4o'),

  // Business Logic
  QUOTE_EXPIRY_MINUTES: z.string().default('120').transform(Number),
  CONSOLIDATE_CHECK_INTERVAL: z.string().default('5').transform(Number),

  // Rate Limiting
  MAX_MESSAGES_PER_PHONE_PER_MINUTE: z.string().default('30').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export { env };
