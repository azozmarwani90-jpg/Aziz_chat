const express = require("express");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

// -------------------------------
// Initialize App
// -------------------------------
const app = express();
app.use(cors({ origin: "*" }));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(express.static("public"));

// -------------------------------
// OpenAI Client
// -------------------------------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -------------------------------
// Supabase Client
// -------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// -------------------------------
// Chat Endpoint (Text + Image)
// -------------------------------
app.post("/chat", async (req, res) => {
  try {
    const { user_id, message, image } = req.body;

    if (!message && !image) {
      return res.status(400).json({ error: "Message or image is required" });
    }

    // Build messages payload
    const messages = [];

    if (image) {
      // If image exists, send text + image in single message
      messages.push({
        role: "user",
        content: [
          { type: "text", text: message || "Analyze this image" },
          {
            type: "input_image",
            image_url: { url: image }, // Frontend already sends full data URL
          },
        ],
      });
    } else if (message) {
      // If only text, send text-only message
      messages.push({
        role: "user",
        content: message,
      });
    }

    // ---------------------------------------
    // NEW: Send to OpenAI using Responses API
    // ---------------------------------------
    const response = await client.responses.create({
      model: "gpt-4o",  // جرّبه أولاً، لو طلع fallback نعرف من اللوق
      input: messages,
    });
    console.log("🚀 MODEL USED BY OPENAI:", response.model);


    // 👇 اطبع اسم الموديل فعلياً
    console.log("Model used by OpenAI:", response.model);

    // Extract reply
    const reply =
      response.output?.[0]?.content?.[0]?.text ||
      "No response generated.";

    // Save chat in Supabase
    await supabase.from("messages").insert([
      {
        user_id: user_id || "guest",
        prompt: message || "[image]",
        reply: reply,
      },
    ]);

    res.json({ reply });

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------------------
// Fetch Conversation History
// -------------------------------
app.get("/history/:user_id", async (req, res) => {
  const { user_id } = req.params;

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// -------------------------------
// Start Server
// -------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
