const mockLogs = [
  { 
    id: 1, 
    timestamp: '10:42 AM', 
    guest: 'Sarah Jenkins',
    room: 'Room 502',
    channel: 'WhatsApp', 
    requestType: 'Late Checkout', 
    aiAction: 'AI approved late checkout',
    pmsStatus: 'Late checkout synced to PMS', 
    confidence: '98%',
    finalStatus: 'Resolved',
    type: 'success',
    details: {
      guestRequest: "Can I have a late checkout tomorrow at 4 PM?",
      aiReply: "Hello Sarah! As a Gold member, I've extended your checkout until 2:00 PM complimentary. Your digital room key has been updated automatically.",
      pmsUpdate: "Late checkout extension posted successfully to folio.",
      escalationReason: ""
    }
  },
  { 
    id: 2, 
    timestamp: '10:38 AM', 
    guest: 'Michael Chen',
    room: 'Room 112',
    channel: 'Email', 
    requestType: 'Spa Booking', 
    aiAction: 'AI escalated refund request',
    pmsStatus: 'Awaiting PMS confirmation', 
    confidence: '62%',
    finalStatus: 'Escalated',
    type: 'warning',
    details: {
      guestRequest: "I want a deep tissue massage but can you apply a special VIP discount?",
      aiReply: "I am routing your request to David at Guest Relations to apply your special VIP discount.",
      pmsUpdate: "Awaiting staff custom discount approval override.",
      escalationReason: "Low confidence: Surcharge waiver fell below standard safety threshold."
    }
  },
  { 
    id: 3, 
    timestamp: '10:35 AM', 
    guest: 'Emma Watson',
    room: 'Room 215',
    channel: 'WhatsApp', 
    requestType: 'WiFi Inquiry', 
    aiAction: 'AI provided WiFi instructions',
    pmsStatus: 'PMS updated successfully', 
    confidence: '95%',
    finalStatus: 'Resolved',
    type: 'success',
    details: {
      guestRequest: "What's the WiFi password here?",
      aiReply: "Hello Emma! You can connect to 'GrandResort_Guest' and log in with your room number 215 and your last name.",
      pmsUpdate: "Query resolved. No folio surcharge required.",
      escalationReason: ""
    }
  },
  { 
    id: 4, 
    timestamp: '09:12 AM', 
    guest: 'James Bond',
    room: 'Room 304',
    channel: 'WhatsApp', 
    requestType: 'Minibar Charge', 
    aiAction: 'AI posted minibar charge',
    pmsStatus: 'Service charge recorded', 
    confidence: '100%',
    finalStatus: 'Resolved',
    type: 'success',
    details: {
      guestRequest: "I took a water bottle and a chocolate from the minibar. Please charge Room 304.",
      aiReply: "Understood, James. I've added a charge of $12.00 for the water and chocolate to your room bill.",
      pmsUpdate: "Minibar refill surcharge posted successfully to guest bill.",
      escalationReason: ""
    }
  }
];

const getActivityLogs = (req, res) => {
  res.status(200).json({
    success: true,
    data: mockLogs
  });
};

module.exports = {
  getActivityLogs
};
