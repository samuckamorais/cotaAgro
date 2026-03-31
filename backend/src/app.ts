import express, { Application, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundHandler } from './utils/error-handler';
import { globalRateLimit, rateLimitByPhone } from './middleware/rate-limit.middleware';
import { authenticate } from './middleware/auth.middleware';
import { WhatsAppController } from './modules/whatsapp/whatsapp.controller';
import { AuthController } from './modules/auth/auth.controller';
import { ProducerController } from './modules/producers/producer.controller';
import { SupplierController } from './modules/suppliers/supplier.controller';
import { QuoteController } from './modules/quotes/quote.controller';
import { DashboardController } from './modules/dashboard/dashboard.controller';

/**
 * Configuração do Express App
 */
export function createApp(): Application {
  const app = express();

  // ===================================
  // Middleware globais
  // ===================================
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(globalRateLimit);

  // ===================================
  // Health check
  // ===================================
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // ===================================
  // API Routes
  // ===================================
  const apiRouter = Router();

  // Auth routes (public)
  apiRouter.post('/auth/otp', AuthController.requestOTP);
  apiRouter.post('/auth/login', AuthController.login);

  // WhatsApp webhook routes (public)
  apiRouter.get('/whatsapp/webhook', WhatsAppController.verifyWebhook);
  apiRouter.post('/whatsapp/webhook', rateLimitByPhone, WhatsAppController.handleWebhook);

  // Dashboard routes (protected)
  apiRouter.get('/dashboard', authenticate, DashboardController.getDashboard);
  apiRouter.get('/dashboard/stats', authenticate, DashboardController.getStats);
  apiRouter.get('/dashboard/quotes-by-day', authenticate, DashboardController.getQuotesByDay);
  apiRouter.get('/dashboard/top-products', authenticate, DashboardController.getTopProducts);

  // Producer routes (protected)
  apiRouter.get('/producers', authenticate, ProducerController.list);
  apiRouter.get('/producers/:id', authenticate, ProducerController.getById);
  apiRouter.post('/producers', authenticate, ProducerController.create);
  apiRouter.put('/producers/:id', authenticate, ProducerController.update);
  apiRouter.delete('/producers/:id', authenticate, ProducerController.delete);
  apiRouter.get('/producers/:id/suppliers', authenticate, ProducerController.getSuppliers);
  apiRouter.post('/producers/:id/suppliers', authenticate, ProducerController.addSupplier);
  apiRouter.delete('/producers/:id/suppliers/:supplierId', authenticate, ProducerController.removeSupplier);

  // Supplier routes (protected)
  apiRouter.get('/suppliers', authenticate, SupplierController.list);
  apiRouter.get('/suppliers/:id', authenticate, SupplierController.getById);
  apiRouter.post('/suppliers', authenticate, SupplierController.create);
  apiRouter.put('/suppliers/:id', authenticate, SupplierController.update);
  apiRouter.delete('/suppliers/:id', authenticate, SupplierController.delete);

  // Quote routes (protected)
  apiRouter.get('/quotes/stats', authenticate, QuoteController.getStats);
  apiRouter.get('/quotes', authenticate, QuoteController.list);
  apiRouter.get('/quotes/:id', authenticate, QuoteController.getById);
  apiRouter.post('/quotes', authenticate, QuoteController.create);
  apiRouter.post('/quotes/:id/dispatch', authenticate, QuoteController.dispatch);
  apiRouter.put('/quotes/:id/close', authenticate, QuoteController.close);

  app.use('/api', apiRouter);

  // ===================================
  // Error handling
  // ===================================
  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
}
