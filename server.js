const express = require("express");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;
    const imageData = req.body.image; // Base64 image data

    if (!userMessage && !imageData) {
      return res.status(400).json({ error: "Message or image is required" });
    }

    console.log("User:", userMessage || "[Image]");

    // Prepare messages for OpenAI
    const messages = [];

    if (imageData) {
      // If image is included, use vision-capable model
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userMessage || "What's in this image?" },
          { type: "image_url", image_url: { url: imageData } }
        ]
      });
    } else {
      // Regular text message
      messages.push({
        role: "user",
        content: userMessage
      });
    }

    const completion = await openai.chat.completions.create({
      model: imageData ? "gpt-4o-mini" : "gpt-3.5-turbo", // Use vision model for images
      messages: messages,
    });

    const aiReply = completion.choices[0]?.message?.content || "No reply";
    console.log("AI:", aiReply);

    res.json({ reply: aiReply });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed: " + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err.message);
  process.exit(1);
});
