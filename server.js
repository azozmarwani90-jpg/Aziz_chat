const express = require("express");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

// -------------------------------
// Initialize App
// -------------------------------
const app = express();
app.use(cors());
app.use(express.json());
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
  process.env.SUPABASE_SERVICE_ROLE_KEY // مهم: SERVICE ROLE KEY
);

// -------------------------------
// Chat Endpoint
// -------------------------------
app.post("/chat", async (req, res) => {
  try {
    const { user_id, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Send prompt to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: message }],
    });

    const reply = completion.choices[0].message.content;

    // Save chat in Supabase
    const { error: dbError } = await supabase.from("messages").insert([
      {
        user_id: user_id || "guest",
        prompt: message,
        reply: reply,
      },
    ]);

    if (dbError) {
      console.error("Supabase Insert Error:", dbError);
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
  console.log(`Server running on http://localhost:${PORT}`);
});
