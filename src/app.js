const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const guestRoutes = require('./routes/guestRoutes');
const requestRoutes = require('./routes/requestRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const planRoutes = require('./routes/planRoutes');
const mewsRoutes = require('./routes/mewsRoutes');
const statsRoutes = require('./routes/statsRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const ragRoutes = require('./routes/ragRoutes');
const revenueRoutes = require('./routes/revenueRoutes');
const activityRoutes = require('./routes/activityRoutes');
const billingRoutes = require('./routes/billingRoutes');
const hotelDocumentRoutes = require('./routes/hotelDocumentRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased limit for local development and polling
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  }
});
app.use('/api', limiter);

// Body and Cookie Parser
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/hotel-request', requestRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/mews', mewsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/activity-logs', activityRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/hotel-documents', hotelDocumentRoutes);
app.use('/api/guest-conversations', require('./routes/guestConversationRoutes'));
app.use('/api/conversations', require('./routes/conversationRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));


// Centralized Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;
