import express, { Application, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundHandler } from './utils/error-handler';
import { globalRateLimit, rateLimitByPhone } from './middleware/rate-limit.middleware';
import { authenticate } from './middleware/auth.middleware';
import { requireTenant } from './middleware/tenant.middleware';
import { requireWhatsAppConfigAccess } from './middleware/rbac.middleware';
import { WhatsAppController } from './modules/whatsapp/whatsapp.controller';
import { WhatsAppConfigController } from './modules/whatsapp-config/whatsapp-config.controller';
import { AuthController } from './modules/auth/auth.controller';
import { ProducerController } from './modules/producers/producer.controller';
import { SupplierController } from './modules/suppliers/supplier.controller';
import { QuoteController } from './modules/quotes/quote.controller';
import { DashboardController } from './modules/dashboard/dashboard.controller';
import { UserController } from './modules/users/user.controller';
import { ProposalController } from './modules/proposals/proposal.controller';
import { SettingsController } from './modules/settings/settings.controller';
import { ReportController } from './modules/reports/report.controller';
import { QuoteFormController } from './modules/quote-form/quote-form.controller';
import subscriptionsRouter from './modules/subscriptions/subscriptions.routes';

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
  apiRouter.post('/auth/login', AuthController.login);

  // Proposal form routes (public — token-based, sem autenticação)
  apiRouter.get('/proposta/:token', ProposalController.getForm);
  apiRouter.post('/proposta/:token', ProposalController.submitForm);
  apiRouter.get('/p/:token', ProposalController.getForm);
  apiRouter.post('/p/:token', ProposalController.submitForm);

  // Quote form routes (public — token-based, produtor preenche cotação via link)
  apiRouter.get('/cotacao/:token', QuoteFormController.getForm);
  apiRouter.post('/cotacao/:token', QuoteFormController.submitForm);

  // WhatsApp webhook routes (public)
  apiRouter.get('/whatsapp/webhook', WhatsAppController.verifyWebhook);
  apiRouter.post('/whatsapp/webhook', rateLimitByPhone, WhatsAppController.handleWebhook);

  // Dashboard routes (protected + tenant isolation)
  apiRouter.get('/dashboard', authenticate, requireTenant, DashboardController.getDashboard);
  apiRouter.get('/dashboard/stats', authenticate, requireTenant, DashboardController.getStats);
  apiRouter.get('/dashboard/quotes-by-day', authenticate, requireTenant, DashboardController.getQuotesByDay);
  apiRouter.get('/dashboard/top-products', authenticate, requireTenant, DashboardController.getTopProducts);

  // Producer routes (protected + tenant isolation)
  apiRouter.get('/producers', authenticate, requireTenant, ProducerController.list);
  apiRouter.get('/producers/:id', authenticate, requireTenant, ProducerController.getById);
  apiRouter.post('/producers', authenticate, requireTenant, ProducerController.create);
  apiRouter.put('/producers/:id', authenticate, requireTenant, ProducerController.update);
  apiRouter.delete('/producers/:id', authenticate, requireTenant, ProducerController.delete);
  apiRouter.get('/producers/:id/suppliers', authenticate, requireTenant, ProducerController.getSuppliers);
  apiRouter.post('/producers/:id/suppliers', authenticate, requireTenant, ProducerController.addSupplier);
  apiRouter.delete('/producers/:id/suppliers/:supplierId', authenticate, requireTenant, ProducerController.removeSupplier);

  // Supplier routes (protected + tenant isolation)
  apiRouter.get('/suppliers', authenticate, requireTenant, SupplierController.list);
  apiRouter.get('/suppliers/:id', authenticate, requireTenant, SupplierController.getById);
  apiRouter.post('/suppliers', authenticate, requireTenant, SupplierController.create);
  apiRouter.put('/suppliers/:id', authenticate, requireTenant, SupplierController.update);
  apiRouter.delete('/suppliers/:id', authenticate, requireTenant, SupplierController.delete);

  // Quote routes (protected + tenant isolation)
  apiRouter.get('/quotes/stats', authenticate, requireTenant, QuoteController.getStats);
  apiRouter.get('/quotes', authenticate, requireTenant, QuoteController.list);
  apiRouter.get('/quotes/:id', authenticate, requireTenant, QuoteController.getById);
  apiRouter.get('/quotes/:id/results', authenticate, requireTenant, QuoteController.getResults);
  apiRouter.post('/quotes', authenticate, requireTenant, QuoteController.create);
  apiRouter.post('/quotes/:id/dispatch', authenticate, requireTenant, QuoteController.dispatch);
  apiRouter.put('/quotes/:id/close', authenticate, requireTenant, QuoteController.close);
  apiRouter.post('/quotes/:id/close-total', authenticate, requireTenant, QuoteController.closeWithTotalWinner);
  apiRouter.post('/quotes/:id/close-by-item', authenticate, requireTenant, QuoteController.closeWithItemWinners);

  // Subscription routes (protected)
  apiRouter.use('/subscriptions', subscriptionsRouter);

  // User routes (protected + tenant isolation)
  apiRouter.get('/users', authenticate, requireTenant, UserController.list);
  apiRouter.get('/users/:id', authenticate, requireTenant, UserController.getById);
  apiRouter.post('/users', authenticate, requireTenant, UserController.create);
  apiRouter.put('/users/:id', authenticate, requireTenant, UserController.update);
  apiRouter.delete('/users/:id', authenticate, requireTenant, UserController.delete);
  apiRouter.patch('/users/:id/status', authenticate, requireTenant, UserController.toggleStatus);

  // Reports routes (protected + tenant isolation)
  apiRouter.get('/reports/funnel', authenticate, requireTenant, ReportController.funnel);
  apiRouter.get('/reports/operational', authenticate, requireTenant, ReportController.operational);
  apiRouter.get('/reports/savings', authenticate, requireTenant, ReportController.savings);
  apiRouter.get('/reports/supplier-performance', authenticate, requireTenant, ReportController.supplierPerformance);
  apiRouter.get('/reports/category-region', authenticate, requireTenant, ReportController.categoryRegion);

  // Settings routes (protected — vinculado ao produtor do usuário logado)
  apiRouter.get('/settings', authenticate, SettingsController.get);
  apiRouter.put('/settings', authenticate, SettingsController.update);

  // WhatsApp Config routes (protected + tenant isolation - admin or WHATSAPP_CONFIG permission)
  const whatsappConfigController = new WhatsAppConfigController();
  apiRouter.get('/admin/whatsapp/config', authenticate, requireTenant, requireWhatsAppConfigAccess('canView'), whatsappConfigController.getConfig.bind(whatsappConfigController));
  apiRouter.put('/admin/whatsapp/config', authenticate, requireTenant, requireWhatsAppConfigAccess('canEdit'), whatsappConfigController.updateConfig.bind(whatsappConfigController));
  apiRouter.delete('/admin/whatsapp/config', authenticate, requireTenant, requireWhatsAppConfigAccess('canDelete'), whatsappConfigController.deleteConfig.bind(whatsappConfigController));
  apiRouter.post('/admin/whatsapp/test', authenticate, requireTenant, requireWhatsAppConfigAccess('canView'), whatsappConfigController.testConnection.bind(whatsappConfigController));
  apiRouter.get('/admin/whatsapp/qrcode', authenticate, requireTenant, requireWhatsAppConfigAccess('canView'), whatsappConfigController.getQRCode.bind(whatsappConfigController));
  apiRouter.post('/admin/whatsapp/reconnect', authenticate, requireTenant, requireWhatsAppConfigAccess('canEdit'), whatsappConfigController.reconnect.bind(whatsappConfigController));
  apiRouter.get('/admin/whatsapp/stats', authenticate, requireTenant, requireWhatsAppConfigAccess('canView'), whatsappConfigController.getStats.bind(whatsappConfigController));
  apiRouter.get('/admin/whatsapp/logs', authenticate, requireTenant, requireWhatsAppConfigAccess('canView'), whatsappConfigController.getLogs.bind(whatsappConfigController));
  apiRouter.post('/admin/whatsapp/webhook/register', authenticate, requireTenant, requireWhatsAppConfigAccess('canEdit'), whatsappConfigController.registerWebhook.bind(whatsappConfigController));

  app.use('/api', apiRouter);

  // ===================================
  // Error handling
  // ===================================
  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
}
