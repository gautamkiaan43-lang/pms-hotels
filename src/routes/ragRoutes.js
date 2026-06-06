const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ragController = require('../controllers/ragController');

// Multer disk storage: saves PDFs to /uploads folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

router.get('/documents', ragController.getDocuments);
router.post('/upload', upload.single('file'), ragController.uploadDocument);
router.post('/reindex/:id', ragController.reindexDocument);
router.post('/query', ragController.queryKnowledge);
router.delete('/documents/:id', ragController.deleteDocument);

module.exports = router;
