const express = require('express');
const billingController = require('../controllers/billingController');

const router = express.Router();

// Hotel Client routes
router.get('/hotel/:id/subscription', billingController.getHotelSubscription);
router.put('/hotel/:id/subscription', billingController.updateHotelSubscription);
router.put('/hotel/:id/subscription/plan', billingController.changePlan);
router.post('/hotel/:id/subscription/pause', billingController.pauseSubscription);
router.get('/hotel/:id/invoices', billingController.getHotelInvoices);

// Public/General routes (simulate PDF generation/download)
router.get('/invoices/:invoiceId/download', billingController.downloadInvoice);

// Super Admin routes
router.get('/admin/revenue', billingController.getAdminRevenue);
router.get('/admin/subscriptions', billingController.getAdminSubscriptions);
router.get('/admin/failed-payments', billingController.getAdminFailedPayments);
router.get('/admin/invoices', billingController.getAdminInvoices);

module.exports = router;
