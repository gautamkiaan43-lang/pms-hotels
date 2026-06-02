const express = require('express');
const router = express.Router();
const ragController = require('../controllers/ragController');

router.get('/documents', ragController.getDocuments);
router.post('/upload', ragController.uploadDocument);
router.post('/query', ragController.queryKnowledge);
router.delete('/documents/:id', ragController.deleteDocument);

module.exports = router;
