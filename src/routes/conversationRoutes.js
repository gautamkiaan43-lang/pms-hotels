const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');

// GET /api/conversations?status=escalated
router.get('/', conversationController.getEscalatedConversations);

// GET /api/conversations/:id/messages
router.get('/:id/messages', conversationController.getConversationMessages);

// POST /api/conversations/:id/human-reply
router.post('/:id/human-reply', conversationController.postHumanReply);

// PUT /api/conversations/:id/return-to-ai
router.put('/:id/return-to-ai', conversationController.putReturnToAI);

// PUT /api/conversations/:id/resolve
router.put('/:id/resolve', conversationController.putResolveConversation);

module.exports = router;
