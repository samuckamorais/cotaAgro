import { z } from 'zod';

// ===================================
// Phone Validation
// ===================================

/**
 * Valida e normaliza número de telefone com DDI
 * Formato esperado: +5564999999999 (DDI + DDD + número)
 */
export const phoneSchema = z
  .string()
  .regex(/^\+\d{12,15}$/, 'Telefone deve estar no formato +5564999999999')
  .transform((phone) => phone.trim());

/**
 * Valida se o telefone é brasileiro
 */
export const validateBrazilianPhone = (phone: string): boolean => {
  return /^\+55\d{10,11}$/.test(phone);
};

// ===================================
// Date Validation
// ===================================

/**
 * Valida que a data é futura
 */
export const futureDateSchema = z.coerce
  .date()
  .refine((date) => date > new Date(), 'Data deve ser futura');

/**
 * Parse de deadline em português
 * Aceita: "2024-03-30", "30/03/2024", "em 3 dias", "amanhã"
 */
export const parseDeadline = (input: string): Date | null => {
  const normalized = input.toLowerCase().trim();

  // "amanhã"
  if (normalized === 'amanhã' || normalized === 'amanha') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // "em X dias"
  const daysMatch = normalized.match(/em\s+(\d+)\s+dias?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate;
  }

  // "daqui a X dias"
  const daysMatch2 = normalized.match(/daqui\s+a\s+(\d+)\s+dias?/);
  if (daysMatch2) {
    const days = parseInt(daysMatch2[1]);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate;
  }

  // "hoje" (hoje + 23:59)
  if (normalized === 'hoje') {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  }

  // Formato ISO: "2024-03-30"
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return new Date(normalized);
  }

  // Formato brasileiro: "30/03/2024"
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    const [day, month, year] = normalized.split('/');
    return new Date(`${year}-${month}-${day}`);
  }

  return null;
};

// ===================================
// Producer Validation
// ===================================

export const createProducerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  phone: phoneSchema,
  region: z.string().min(2, 'Região deve ter no mínimo 2 caracteres'),
});

export const updateProducerSchema = z.object({
  name: z.string().min(3).optional(),
  phone: phoneSchema.optional(),
  region: z.string().min(2).optional(),
});

// ===================================
// Supplier Validation
// ===================================

export const createSupplierSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  phone: phoneSchema,
  regions: z.array(z.string()).min(1, 'Informe ao menos uma região'),
  categories: z.array(z.string()).min(1, 'Informe ao menos uma categoria'),
  isNetworkSupplier: z.boolean().optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(3).optional(),
  phone: phoneSchema.optional(),
  regions: z.array(z.string()).min(1).optional(),
  categories: z.array(z.string()).min(1).optional(),
  isNetworkSupplier: z.boolean().optional(),
});

// ===================================
// Quote Validation
// ===================================

export const createQuoteSchema = z.object({
  producerId: z.string().uuid(),
  product: z.string().min(2, 'Produto deve ter no mínimo 2 caracteres'),
  quantity: z.string().min(1, 'Quantidade é obrigatória'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  region: z.string().min(2, 'Região é obrigatória'),
  deadline: futureDateSchema,
  observations: z.string().optional(),
  supplierScope: z.enum(['MINE', 'NETWORK', 'ALL']),
});

// ===================================
// Proposal Validation
// ===================================

export const createProposalSchema = z.object({
  quoteId: z.string().uuid(),
  supplierId: z.string().uuid(),
  price: z.number().positive('Preço deve ser positivo'),
  totalPrice: z.number().positive('Preço total deve ser positivo'),
  paymentTerms: z.string().min(3, 'Condição de pagamento é obrigatória'),
  deliveryDays: z.number().int().positive('Prazo de entrega deve ser positivo'),
  observations: z.string().optional(),
  isOwnSupplier: z.boolean().optional(),
});

// ===================================
// Subscription Validation
// ===================================

export const createSubscriptionSchema = z.object({
  producerId: z.string().uuid(),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

// ===================================
// Pagination Validation
// ===================================

export const paginationSchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
});

/**
 * Valida que limit está entre 1 e 100
 */
export const validatePaginationLimit = (limit: number): number => {
  return Math.max(1, Math.min(limit, 100));
};
