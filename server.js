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

// مهم جداً لرفع الصور (Base64)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(express.static("public"));

// -------------------------------
// OpenAI Client
// -------------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -------------------------------
// Supabase Client
// -------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // لازم يكون SERVICE ROLE
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

    // Build messages payload for OpenAI
    const messages = [];

    if (message) {
      messages.push({
        role: "user",
        content: message,
      });
    }

    if (image) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: message || "Analyze this image" },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${image}` },
          },
        ],
      });
    }

    // Send to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
    });

    const reply = completion.choices[0].message.content;

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
