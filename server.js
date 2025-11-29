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
            type: "input_image",
            image_url: { url: `data:image/jpeg;base64,${image}` },
          },
        ],
      });
    }

    // -------------------------------
    // Send to OpenAI (supports GPT-5 / GPT-6 / 4o)
    // -------------------------------
    const response = await client.responses.create({
      model: "gpt-5", 
      input: messages,
    });

    // Log the actual model used (important!)
    console.log(
      "🚀 MODEL USED BY OPENAI:",
      response.model
    );

    // -------------------------------
    // Extract reply (works for all models)
    // -------------------------------
    let reply;

    if (response.output_text) {
      reply = response.output_text; // GPT-5 / GPT-6
    } else if (response.output?.[0]?.content?.[0]?.text) {
      reply = response.output[0].content[0].text; // GPT-4o
    } else {
      reply = "No response generated.";
    }

    // -------------------------------
    // Save chat in Supabase
    // -------------------------------
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
