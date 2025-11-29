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
// Chat Endpoint (Text + Image with Full Context)
// -------------------------------
app.post("/chat", async (req, res) => {
  try {
    const { user_id, message, image } = req.body;

    if (!message && !image) {
      return res.status(400).json({ error: "Message or image is required" });
    }

    const userId = user_id || "guest";

    // -------------------------------
    // 1. FETCH CONVERSATION HISTORY FROM SUPABASE
    // -------------------------------
    const { data: history, error: fetchError } = await supabase
      .from("messages")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      return res.status(500).json({ error: "Server error" });
    }

    // -------------------------------
    // 2. BUILD CONVERSATION ARRAY
    // -------------------------------
    const conversation = [
      { role: "system", content: "You are a helpful assistant." }
    ];

    // Add previous messages from Supabase
    if (history && history.length > 0) {
      history.forEach(row => {
        conversation.push({ role: "user", content: row.prompt });
        conversation.push({ role: "assistant", content: row.reply });
      });
    }

    // -------------------------------
    // 3. APPEND NEW USER MESSAGE
    // -------------------------------
    if (image) {
      // If image exists, send text + image in single message
      conversation.push({
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
      conversation.push({
        role: "user",
        content: message,
      });
    }

    // -------------------------------
    // 4. CONTEXT TRIMMING (keep last 8 back-and-forth + system)
    // -------------------------------
    // Total messages = system + (user + assistant pairs)
    // If more than 20 messages (1 system + 19 others), trim to keep last 8 pairs (16 messages) + system
    if (conversation.length > 20) {
      const systemMsg = conversation[0]; // Keep system message
      const recentMessages = conversation.slice(-16); // Keep last 16 messages (8 user+assistant pairs)
      conversation.splice(0, conversation.length, systemMsg, ...recentMessages);
    }

    // -------------------------------
    // 5. SEND TO OPENAI WITH FULL CONTEXT
    // -------------------------------
    const response = await client.responses.create({
      model: "gpt-5", 
      input: conversation,
    });

    // Log the actual model used (important!)
    console.log("🚀 MODEL USED BY OPENAI:", response.model);

    // -------------------------------
    // 6. EXTRACT REPLY (works for all models)
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
    // 7. SAVE NEW MESSAGE TO SUPABASE
    // -------------------------------
    const { error: insertError } = await supabase.from("messages").insert([
      {
        user_id: userId,
        prompt: message || "[image]",
        reply: reply,
      },
    ]);

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return res.status(500).json({ error: "Server error" });
    }

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
