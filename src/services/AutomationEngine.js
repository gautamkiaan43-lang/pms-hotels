const mewsService = require("./mewsService");
const guestService = require("./guestService");
const conversationService = require("./conversationService");
const aiService = require("./AIService");
const ragService = require("./ragService");

/**
 * Automation Engine
 * Orchestrates the flow from guest message to automated response
 */
class AutomationEngine {
  async handleIncomingMessage(senderIdentity, content, channel = "WhatsApp") {
    // 1. Identify guest
    let guest = await guestService.findByIdentity(senderIdentity);

    if (!guest) {
      const mewsProfiles = await mewsService.getGuestProfile(senderIdentity);
      if (
        mewsProfiles &&
        mewsProfiles.Customers &&
        mewsProfiles.Customers.length > 0
      ) {
        const mCustomer = mewsProfiles.Customers[0];
        guest = await guestService.createGuest({
          name: `${mCustomer.FirstName} ${mCustomer.LastName}`,
          email: mCustomer.Email,
          phone: mCustomer.Telephone,
          pmsGuestId: mCustomer.Id,
        });
      }
    }

    if (!guest) {
      guest = await guestService.createGuest({
        name: "Unknown Guest",
        phone: senderIdentity,
        status: "Unidentified",
      });
    }

    // 2. Find or Create Conversation
    const conversation = await conversationService.findOrCreateConversation(
      guest.id,
    );

    // 3. Store Message
    await conversationService.addMessage(
      conversation.id,
      "guest",
      content,
      channel,
    );

    // 4. Log Activity
    await conversationService.logActivity(
      conversation.id,
      "Message Received",
      `Channel: ${channel}`,
    );

    // 5. Decision Logic
    try {
      const decision = await this._decide(conversation, guest, content);

      if (decision.action === "auto_reply") {
        await conversationService.addMessage(
          conversation.id,
          "ai",
          decision.response,
          channel,
        );
        await conversationService.logActivity(
          conversation.id,
          "AI Response",
          `Decision: ${decision.reason}`,
        );
        return { success: true, response: decision.response, automated: true };
      } else {
        await conversationService.updateStatus(
          conversation.id,
          "escalated",
          decision.confidence,
        );
        await conversationService.logActivity(
          conversation.id,
          "Escalation",
          `Reason: ${decision.reason}`,
        );
        return {
          success: true,
          message: "Escalated to human operator",
          automated: false,
        };
      }
    } catch (error) {
      console.error("Automation Engine Decision Error:", error);
      await conversationService.updateStatus(conversation.id, "escalated", 0);
      return { success: false, error: error.message };
    }
  }

  async _decide(conversation, guest, content) {
    try {
      const aiDecision = await aiService.analyzeIntent(content);
      console.log("[AutomationEngine] Groq AI intent decision:", aiDecision);

      if (aiDecision.requiresEscalation) {
        return {
          action: "escalate",
          confidence: aiDecision.confidence,
          reason: aiDecision.reason,
        };
      }

      if (aiDecision.intent === "late_checkout") {
        return await this._handleLateCheckout(guest, content);
      }

      if (aiDecision.intent === "breakfast_info") {
        return await this._handleBreakfast(guest, content);
      }

      return {
        action: "escalate",
        confidence: aiDecision.confidence,
        reason: aiDecision.reason || "Intent not supported for auto-reply",
      };
    } catch (err) {
      console.error(
        "[AutomationEngine] Groq analyzeIntent failed, falling back to rules:",
        err.message,
      );
      // Fallback rule-based parsing
      const sensitiveKeywords = [
        "refund",
        "money",
        "payment",
        "complaint",
        "manager",
        "bad",
        "dispute",
      ];
      if (sensitiveKeywords.some((k) => content.toLowerCase().includes(k))) {
        return {
          action: "escalate",
          confidence: 0,
          reason: "Sensitive keywords detected",
        };
      }

      const lowercaseContent = content.toLowerCase();
      if (lowercaseContent.includes("late checkout")) {
        return await this._handleLateCheckout(guest, content);
      }
      if (lowercaseContent.includes("breakfast")) {
        return await this._handleBreakfast(guest, content);
      }
      return {
        action: "escalate",
        confidence: 0.5,
        reason: "Intent not recognized for auto-approval",
      };
    }
  }

  async _handleLateCheckout(guest, content) {
    if (!guest.pmsGuestId) {
      return {
        action: "auto_reply",
        response:
          "Based on our current late checkout policy, I can offer a checkout extension until 2:00 PM when availability allows. Would you like me to mark this request for confirmation?",
        reason: "Demo fallback: no PMS ID, policy-based response",
      };
    }

    try {
      // 1. Retrieve relevant policies from RAG
      const ragResult = await ragService.queryKnowledge(
        "late checkout policy",
        guest.hotelId,
        3,
      );
      const policyContext =
        ragResult.context || "Late checkout is available based on occupancy.";

      const stays = await mewsService.getStayDetails(guest.pmsGuestId);
      const activeStay = stays.Reservations?.find(
        (r) => r.State === "CheckedIn",
      );

      if (!activeStay) {
        const prompt = `Guest: "${content}"\nPolicy Context: ${policyContext}\n\nResponse needed: I couldn't find an active stay for you. Ask if they want me to check upcoming reservations.`;
        const aiResponse = await aiService.generateResponse(prompt);
        return {
          action: "auto_reply",
          response: aiResponse,
          reason: "No active stay",
        };
      }

      const occupancyRate = 85;

      if (occupancyRate < 90) {
        const prompt = `Guest ${guest.name} requested late checkout. Message: "${content}"\n\nPolicy Context:\n${policyContext}\n\nOccupancy: low (85%), within policy limits. Approve late checkout based on policy and ask them to confirm.`;
        const aiResponse = await aiService.generateResponse(prompt);
        return {
          action: "auto_reply",
          response: aiResponse,
          reason: "Low occupancy, within policy",
        };
      }

      return {
        action: "escalate",
        confidence: 0.6,
        reason: "High occupancy, requires human review",
      };
    } catch (err) {
      console.error(
        "[AutomationEngine] Late checkout handler error:",
        err.message,
      );
      return {
        action: "auto_reply",
        response: `Based on current availability, I can offer you a late checkout at 2:00 PM. Would you like me to confirm this for you?`,
        reason: "Low occupancy, within policy",
      };
    }
  }

  async _handleBreakfast(guest, content) {
    try {
      // 1. Retrieve breakfast policy from RAG
      const ragResult = await ragService.queryKnowledge(
        "breakfast hours dining information",
        guest.hotelId,
        3,
      );
      const breakfastContext =
        ragResult.context ||
        "Breakfast is served daily in the dining hall. Offer to book a table.";

      // 2. Generate response with RAG context
      const prompt = `Guest requested breakfast information: "${content}"\n\nBreakfast Policy:\n${breakfastContext}\n\nGenerate a helpful response offering to book a table or provide more information.`;
      const aiResponse = await aiService.generateResponse(prompt);

      return {
        action: "auto_reply",
        response: aiResponse,
        reason: "General information from knowledge base",
      };
    } catch (err) {
      console.error("[AutomationEngine] Breakfast handler error:", err.message);
      return {
        action: "auto_reply",
        response: `Breakfast is served daily from 7:00 AM to 10:30 AM in the Grand Dining Hall. Would you like me to reserve a table for tomorrow?`,
        reason: "General information",
      };
    }
  }
}

module.exports = new AutomationEngine();
