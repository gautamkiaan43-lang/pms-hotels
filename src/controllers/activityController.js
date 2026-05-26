const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const asyncHandler = require('../middleware/asyncHandler');

/**
 * GET /api/activity-logs
 * Returns real activity logs from the DB, joined with Conversation + Guest data.
 * Supports optional query params: filter (All|Resolved|Escalated), search, limit
 */
const getActivityLogs = asyncHandler(async (req, res) => {
  const { filter, search, limit = 100 } = req.query;

  // Fetch activity logs joined with conversation and guest
  const logs = await prisma.activityLog.findMany({
    take: parseInt(limit),
    orderBy: { createdAt: 'desc' },
    include: {
      conversation: {
        include: {
          guest: true,
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 10,
          },
        },
      },
    },
  });

  // Transform DB records into the shape the frontend expects
  const formatted = logs.map((log) => {
    const conversation = log.conversation;
    const guest = conversation?.guest;

    // Parse actionDetails – stored as JSON string or plain text
    let details = {};
    try {
      details = JSON.parse(log.actionDetails);
    } catch {
      details = {
        guestRequest: log.actionDetails || '',
        aiReply: '',
        pmsUpdate: '',
        escalationReason: '',
      };
    }

    // Derive channel from the first message in the conversation
    const firstMsg = conversation?.messages?.[0];
    const channel = firstMsg?.channel || 'WhatsApp';

    // Derive confidence from conversation score (stored as 0-1 float → convert to %)
    const confidenceRaw = conversation?.confidenceScore ?? 1;
    const confidencePct = Math.round(confidenceRaw * 100);

    // Derive final status
    const isFailed = log.actionType?.toLowerCase().includes('escalat');
    const finalStatus = isFailed ? 'Escalated' : 'Resolved';

    // Timestamp – formatted as HH:MM AM/PM
    const timestamp = new Date(log.createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      id: log.id,
      timestamp,
      createdAt: log.createdAt,
      guest: guest?.name || 'Unknown Guest',
      room: guest?.roomNumber ? `Room ${guest.roomNumber}` : 'N/A',
      channel,
      requestType: details.requestType || log.actionType || 'Guest Request',
      aiAction: details.aiAction || log.actionType || 'AI processed request',
      pmsStatus: details.pmsUpdate || 'PMS updated',
      confidence: `${confidencePct}%`,
      finalStatus,
      type: finalStatus === 'Escalated' ? 'warning' : 'success',
      details: {
        guestRequest: details.guestRequest || '',
        aiReply: details.aiReply || '',
        pmsUpdate: details.pmsUpdate || '',
        escalationReason: details.escalationReason || '',
      },
    };
  });

  // Apply filter
  let filtered = formatted;
  if (filter && filter !== 'All Logs') {
    filtered = formatted.filter((l) => l.finalStatus === filter);
  }

  // Apply search (guest name or room)
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.guest.toLowerCase().includes(q) ||
        l.room.toLowerCase().includes(q) ||
        l.requestType.toLowerCase().includes(q)
    );
  }

  return res.status(200).json({
    success: true,
    total: filtered.length,
    data: filtered,
  });
});

module.exports = { getActivityLogs };
