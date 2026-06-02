const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { decrypt } = require('../utils/cryptoUtils');

/**
 * WhatsApp Service
 * Handles outbound messaging to the Meta Cloud API dynamically per hotel
 */
class WhatsAppService {
  /**
   * Send a text message to a guest via WhatsApp
   */
  async sendMessage(hotelId, toPhoneNumber, text) {
    try {
      const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
      if (!hotel) throw new Error(`Hotel with ID ${hotelId} not found`);
      if (!hotel.whatsappApiKey || !hotel.whatsappPhoneId) {
        throw new Error(`WhatsApp credentials missing for Hotel ID ${hotelId}`);
      }

      const accessToken = decrypt(hotel.whatsappApiKey);
      const phoneId = hotel.whatsappPhoneId;

      console.log(`\n========================================`);
      console.log(`🤖 AI Response to ${toPhoneNumber}:`);
      console.log(text);
      console.log(`========================================\n`);

      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toPhoneNumber,
        type: "text",
        text: {
          preview_url: false,
          body: text
        }
      };

      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || `WhatsApp API Error: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`WhatsApp Send Message Failed for Hotel ${hotelId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new WhatsAppService();
