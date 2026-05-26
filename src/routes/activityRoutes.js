const express = require('express');
const router  = express.Router();
const activityController = require('../controllers/activityController');

// GET /api/activity-logs?filter=All|Resolved|Escalated&search=&limit=100
router.get('/', activityController.getActivityLogs);

module.exports = router;
