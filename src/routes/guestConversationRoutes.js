const express = require('express');
const router = express.Router();
const guestConversationController = require('../controllers/guestConversationController');

// Create a new conversation (guest optional)
router.post('/', guestConversationController.createConversation);

// Get conversation details + messages
router.get('/:id', guestConversationController.getConversation);

// Add a message (guest or ai)
router.post('/:id/message', guestConversationController.postMessage);

// Trigger AI reply based on latest guest message
router.post('/:id/ai-reply', guestConversationController.invokeAI);

module.exports = router;
