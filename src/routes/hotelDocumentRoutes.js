const express = require('express');
const router = express.Router();
const hotelDocumentController = require('../controllers/hotelDocumentController');

router.post('/upload', hotelDocumentController.uploadDocument);

module.exports = router;
