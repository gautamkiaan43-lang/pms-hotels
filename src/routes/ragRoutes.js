const express = require('express');
const router = express.Router();
const ragController = require('../controllers/ragController');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route definitions
router.get('/documents', ragController.getDocuments);
router.post('/upload', upload.single('file'), ragController.uploadDocument);
router.post('/query', ragController.queryKnowledge);
router.delete('/documents/:id', ragController.deleteDocument);
router.get('/query-test', ragController.queryKnowledgeTest);
router.post('/reindex/:id', ragController.reindexDocument);
module.exports = router;
