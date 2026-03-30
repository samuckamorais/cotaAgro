// Re-export Prisma types
export { SupplierScope, QuoteStatus, PlanType, Producer, Supplier, Quote, Proposal } from '@prisma/client';

// ===================================
// DTOs (Data Transfer Objects)
// ===================================

export interface CreateProducerDTO {
  name: string;
  phone: string;
  region: string;
}

export interface UpdateProducerDTO {
  name?: string;
  phone?: string;
  region?: string;
}

export interface CreateSupplierDTO {
  name: string;
  phone: string;
  regions: string[];
  categories: string[];
  isNetworkSupplier?: boolean;
}

export interface UpdateSupplierDTO {
  name?: string;
  phone?: string;
  regions?: string[];
  categories?: string[];
  isNetworkSupplier?: boolean;
}

export interface CreateQuoteDTO {
  producerId: string;
  product: string;
  quantity: string;
  unit: string;
  region: string;
  deadline: Date;
  observations?: string;
  supplierScope: 'MINE' | 'NETWORK' | 'ALL';
}

export interface CreateProposalDTO {
  quoteId: string;
  supplierId: string;
  price: number;
  totalPrice: number;
  paymentTerms: string;
  deliveryDays: number;
  observations?: string;
  isOwnSupplier?: boolean;
}

export interface CreateSubscriptionDTO {
  producerId: string;
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  startDate: Date;
  endDate: Date;
}

// ===================================
// WhatsApp Types
// ===================================

export interface IncomingMessage {
  from: string; // número do remetente com DDI
  body: string; // corpo da mensagem
  timestamp?: Date;
}

export interface OutgoingMessage {
  to: string; // número do destinatário com DDI
  body: string; // corpo da mensagem
}

export interface WhatsAppWebhookPayload {
  from: string;
  body: string;
  timestamp?: string;
  [key: string]: unknown; // permite outras propriedades específicas do provider
}

// ===================================
// FSM (Finite State Machine) Types
// ===================================

export type ProducerState =
  | 'IDLE'
  | 'AWAITING_PRODUCT'
  | 'AWAITING_QUANTITY'
  | 'AWAITING_REGION'
  | 'AWAITING_DEADLINE'
  | 'AWAITING_OBSERVATIONS'
  | 'AWAITING_SUPPLIER_SCOPE'
  | 'AWAITING_CONFIRMATION'
  | 'QUOTE_ACTIVE'
  | 'AWAITING_CHOICE'
  | 'CLOSED';

export type SupplierState =
  | 'SUPPLIER_IDLE'
  | 'SUPPLIER_AWAITING_RESPONSE'
  | 'SUPPLIER_AWAITING_PRICE'
  | 'SUPPLIER_AWAITING_DELIVERY'
  | 'SUPPLIER_AWAITING_PAYMENT'
  | 'SUPPLIER_AWAITING_OBS'
  | 'SUPPLIER_PROPOSAL_SENT';

export interface ConversationContext {
  product?: string;
  quantity?: string;
  unit?: string;
  region?: string;
  deadline?: string;
  observations?: string;
  supplierScope?: 'MINE' | 'NETWORK' | 'ALL';
  quoteId?: string;

  // Supplier context
  price?: number;
  deliveryDays?: number;
  paymentTerms?: string;
}

export interface StateTransition {
  nextState: ProducerState | SupplierState;
  response: string;
  updateContext?: Partial<ConversationContext>;
}

// ===================================
// OpenAI NLU Types
// ===================================

export interface NLUResult {
  intent:
    | 'nova_cotacao'
    | 'ver_cotacao'
    | 'cancelar'
    | 'saudacao'
    | 'ajuda'
    | 'responder_cotacao'
    | 'recusar_cotacao'
    | 'desconhecido';
  entities: {
    product?: string;
    quantity?: string;
    unit?: string;
    region?: string;
    deadline?: string;
  };
  confidence: number;
}

// ===================================
// API Response Types
// ===================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===================================
// Dashboard Types
// ===================================

export interface DashboardStats {
  quotesToday: number;
  proposalsReceived: number;
  closureRate: number; // taxa de fechamento em %
  activeProducers: number;
}

export interface QuotesByDay {
  date: string;
  count: number;
}

export interface TopProduct {
  product: string;
  count: number;
}

// ===================================
// Error Types
// ===================================

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}
