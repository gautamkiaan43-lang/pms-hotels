const prisma = require('../config/prisma');

/**
 * WhatsApp Business Cloud API Integration Service
 * Manages sending outbound messages, templates, and interactive elements.
 * Supports multi-tenant dynamic credential lookup per Hotel.
 */
class WhatsAppService {
  /**
   * Send a standard text message to a guest via WhatsApp Business Cloud API
   * @param {number} hotelId - The ID of the Hotel tenant
   * @param {string} to - Guest's WhatsApp number (e.g., '+49123456789')
   * @param {string} text - Message body to send
   */
  async sendMessage(hotelId, to, text) {
    try {
      // 1. Fetch Hotel tenant credentials
      const hotel = await prisma.hotel.findUnique({
        where: { id: Number(hotelId) }
      });

      if (!hotel) {
        console.warn(`[WhatsAppService] Hotel tenant not found for ID: ${hotelId}. Bypassing send.`);
        return { success: false, error: 'Hotel not found' };
      }

      const phoneId = hotel.whatsappPhoneId;
      const apiKey = hotel.whatsappApiKey;

      // 2. Fallback Mode: Check if Meta credentials exist
      if (
        !phoneId || 
        !apiKey || 
        apiKey === '••••••••••••••••' || 
        apiKey.toLowerCase().includes('dummy') || 
        apiKey.toLowerCase().includes('placeholder')
      ) {
        console.log(`[WhatsAppService] [MOCK MODE] WhatsApp credentials not configured for "${hotel.hotelName}" (ID: ${hotel.id}). Bypassing API call for demo stability.`);
        return { success: true, simulated: true };
      }

      console.log(`[WhatsAppService] Sending outbound live WhatsApp message to ${to} via Phone ID ${phoneId}`);

      // 3. Clean phone number format for Meta API (remove non-digits, keep leading digits)
      const cleanPhone = to.replace(/[^\d+]/g, '').replace(/^\+/, '');

      // 4. Meta Cloud API POST Request
      const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            body: text
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[WhatsAppService] Meta API returned an error:', result);
        throw new Error(result.error?.message || `WhatsApp API HTTP error ${response.status}`);
      }

      console.log(`[WhatsAppService] Live WhatsApp message delivered successfully to ${to}, Message ID: ${result.messages?.[0]?.id}`);
      return { success: true, messageId: result.messages?.[0]?.id, simulated: false };

    } catch (err) {
      console.error(`[WhatsAppService] Failed to send outbound WhatsApp message:`, err.message);
      // Return false but do not crash the runtime
      return { success: false, error: err.message };
    }
  }
}

module.exports = new WhatsAppService();
