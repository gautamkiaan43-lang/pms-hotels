/**
 * AIService - Real-time AI Intent Analysis and Custom Response Generation via Groq Cloud
 */

const analyzeIntent = async (message) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in .env');
  }

  const systemPrompt = `You are the core AI Decision Engine for a luxury hotel automation platform.
Analyze the following guest message and return a JSON object with:
{
  "intent": "late_checkout" | "breakfast_info" | "other",
  "confidence": 0.0 to 1.0,
  "requiresEscalation": true | false,
  "reason": "explanation of your assessment"
}

Rules:
- Late checkouts under 2 PM are allowed if occupancy is low.
- Breakfast is served 7:00 AM - 10:30 AM in the Grand Dining Hall.
- If the message contains sensitive keywords (complaints, money, payments, manager requests, angry tone, disputes, billing discrepancies, refund requests), set "requiresEscalation" to true.
Reply ONLY with the raw JSON object. Do not include markdown code blocks or any text outside of the JSON object.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Groq API Error: ${response.status}`);
    }

    const content = data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('[GROQ SERVICE] analyzeIntent Error, falling back to rules:', error.message);
    // Fallback to simple local rule-based intent parsing if API fails
    const lowercase = message.toLowerCase();
    if (lowercase.includes('late checkout')) {
      return { intent: 'late_checkout', confidence: 0.9, requiresEscalation: false, reason: 'Rule-based fallback: late checkout detected' };
    }
    if (lowercase.includes('breakfast')) {
      return { intent: 'breakfast_info', confidence: 0.9, requiresEscalation: false, reason: 'Rule-based fallback: breakfast detected' };
    }
    return { intent: 'other', confidence: 0.5, requiresEscalation: true, reason: 'Rule-based fallback: other intent' };
  }
};

const generateResponse = async (prompt, systemInstruction = '') => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in .env');
  }

  const defaultSystem = `You are "StayFlow AI", an upscale, extremely polite, and helpful virtual guest assistant for a luxury hotel resort.
Generate a polite, personalized, and elegant response to the guest's request. Keep it warm, descriptive, and concise.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemInstruction || defaultSystem },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Groq API Error: ${response.status}`);
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('[GROQ SERVICE] generateResponse Error, using fallback:', error.message);
    return "Thank you for your request. I have received it and will look into it immediately.";
  }
};

module.exports = {
  analyzeIntent,
  generateResponse
};
