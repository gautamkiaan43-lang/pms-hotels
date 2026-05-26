const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15555555555",
              phone_number_id: "1234567890"
            },
            contacts: [
              {
                profile: {
                  name: "Sarah Jenkins"
                },
                wa_id: "49123456789"
              }
            ],
            messages: [
              {
                from: "+49123456789",
                id: "wamid.test_checkout_message_" + Date.now(),
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: {
                  body: "Hi! Can I get a late checkout tomorrow?"
                },
                type: "text"
              }
            ]
          },
          field: "messages"
        }
      ]
    }
  ]
};

fetch("http://localhost:5000/api/webhooks/whatsapp", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
})
  .then(res => {
    console.log("Response status:", res.status);
    return res.text();
  })
  .then(text => {
    console.log("Response text:", text);
    process.exit(0);
  })
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
