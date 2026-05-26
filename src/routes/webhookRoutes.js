const express = require('express');
const router = express.Router();
const whatsappWebhookController = require('../controllers/whatsappWebhookController');

// Webhook Meta API Challenge Handshake (Verification)
// GET /api/webhooks/whatsapp
router.get('/whatsapp', whatsappWebhookController.verifyWebhook);

// Webhook Meta Event Receiver (Incoming Messages)
// POST /api/webhooks/whatsapp
router.post('/whatsapp', whatsappWebhookController.handleWebhookEvent);

// Custom Inbound Email Webhook
// POST /api/webhooks/email
const guestConversationController = require('../controllers/guestConversationController');
router.post('/email', guestConversationController.handleInboundEmailWebhook);

module.exports = router;
