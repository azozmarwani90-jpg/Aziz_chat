const express = require("express");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

// CineMood Helpers
const tmdbHelper = require("./tmdb_helper");
const aiHelper = require("./ai_helper");

// -------------------------------
// Environment Variable Validation
// -------------------------------
const requiredEnv = [
  "OPENAI_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TMDB_API_KEY"
];

console.log("🔍 Checking environment variables...");
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
  } else {
    console.log(`✅ ${key} is set`);
  }
}

// -------------------------------
// Initialize App
// -------------------------------
const app = express();

// CORS with logging
app.use(cors({ origin: "*" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from origin: ${req.headers.origin || 'direct'}`);
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(express.static("public"));
console.log("📁 Serving static files from /public");

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
// TMDB API Key
// -------------------------------
const TMDB_KEY = process.env.TMDB_API_KEY;

// ===============================
// HEALTH CHECK ENDPOINT
// ===============================
app.get("/api/health", (req, res) => {
  console.log("🏥 Health check hit");
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasSupabase: !!process.env.SUPABASE_URL,
      hasTMDB: !!process.env.TMDB_API_KEY
    }
  });
});

// ===============================
// CINEMOOD API ENDPOINTS
// ===============================

// -------------------------------
// 🎬 POST /api/recommend
// Main mood-based recommendation endpoint
// -------------------------------
app.post("/api/recommend", async (req, res) => {
  console.log("[BACKEND] /api/recommend - Incoming request", { 
    body: req.body,
    user_id: req.body?.user_id,
    mood_text_length: req.body?.mood_text?.length 
  });

  try {
    const { user_id, mood_text } = req.body;

    // Validation
    if (!mood_text || typeof mood_text !== 'string' || mood_text.trim().length === 0) {
      console.log("[BACKEND] /api/recommend - Validation failed: mood_text missing or empty");
      return res.status(400).json({ 
        ok: false,
        error: "mood_text is required",
        code: "VALIDATION_ERROR"
      });
    }

    if (!TMDB_KEY) {
      console.error("[BACKEND] /api/recommend - TMDB_KEY not configured");
      return res.status(500).json({ 
        ok: false,
        error: "TMDB API key not configured",
        code: "CONFIG_ERROR"
      });
    }

    const userId = user_id || "guest";
    console.log(`[BACKEND] /api/recommend - Processing mood: "${mood_text}" for user: ${userId}`);

    // STEP 1: Parse mood with AI
    console.log("[BACKEND] /api/recommend - Calling OpenAI to parse mood...");
    const moodData = await aiHelper.parseMood(client, mood_text);
    console.log('[BACKEND] /api/recommend - OpenAI mood parsing success:', moodData);

    // STEP 2: Get genre IDs for TMDB
    const genreIds = tmdbHelper.mapGenresToIds(moodData.genres);
    console.log(`[BACKEND] /api/recommend - Mapped to genre IDs: ${genreIds.join(', ')}`);

    // STEP 3: Fetch titles from TMDB (mix of movies and TV)
    console.log("[BACKEND] /api/recommend - Fetching titles from TMDB...");
    const [movies, tvShows] = await Promise.all([
      tmdbHelper.discoverMovies(TMDB_KEY, genreIds, { maxResults: 6 }),
      tmdbHelper.discoverTV(TMDB_KEY, genreIds, { maxResults: 4 })
    ]);
    console.log(`[BACKEND] /api/recommend - TMDB discover success: ${movies.length} movies, ${tvShows.length} TV shows`);

    let allTitles = [...movies, ...tvShows];

    // Shuffle for variety
    allTitles = allTitles.sort(() => Math.random() - 0.5).slice(0, 8);

    if (allTitles.length === 0) {
      console.log("[BACKEND] /api/recommend - No titles found, returning empty result");
      return res.json({
        ok: true,
        mood_summary: "Even the universe is confused… try another mood.",
        recommendations: []
      });
    }

    // STEP 4: Generate AI commentary for each title
    console.log("[BACKEND] /api/recommend - Generating AI commentary...");
    const whyItFits = await aiHelper.generateMoodFit(
      client,
      mood_text,
      moodData.mood_tags,
      allTitles
    );
    console.log("[BACKEND] /api/recommend - AI commentary generation success");

    // Attach why_it_fits to each title
    const recommendations = allTitles.map((title, index) => ({
      ...title,
      why_it_fits: whyItFits[index] || 'A great match for your mood.'
    }));

    // STEP 5: Save to Supabase
    console.log("[BACKEND] /api/recommend - Saving to Supabase...");
    // Save mood history
    const { data: moodRecord, error: moodError } = await supabase
      .from("mood_history")
      .insert([
        {
          user_id: userId,
          mood_text: mood_text,
          mood_tags: moodData.mood_tags,
          genres: moodData.genres
        }
      ])
      .select()
      .single();

    if (moodError) {
      console.error('[BACKEND] /api/recommend - Supabase mood_history error:', moodError);
    } else {
      console.log('[BACKEND] /api/recommend - Supabase mood_history insert success');
    }

    // Save recommendations
    if (moodRecord && moodRecord.id) {
      const recsToInsert = recommendations.map(rec => ({
        user_id: userId,
        mood_id: moodRecord.id,
        tmdb_id: rec.tmdb_id,
        type: rec.type,
        title: rec.title,
        why_it_fits: rec.why_it_fits
      }));

      const { error: recsError } = await supabase
        .from("recommendations_history")
        .insert(recsToInsert);

      if (recsError) {
        console.error('[BACKEND] /api/recommend - Supabase recommendations_history error:', recsError);
      } else {
        console.log('[BACKEND] /api/recommend - Supabase recommendations_history insert success');
      }
    }

    // STEP 6: Return response
    console.log(`[BACKEND] /api/recommend - Success! Returning ${recommendations.length} recommendations`);
    res.json({
      ok: true,
      mood_summary: `Found ${recommendations.length} ${moodData.mood_tags.join(', ')} picks for you`,
      mood_tags: moodData.mood_tags,
      genres: moodData.genres,
      recommendations
    });

  } catch (error) {
    console.error("[BACKEND] /api/recommend - ERROR:", error);
    console.error("[BACKEND] /api/recommend - Error stack:", error.stack);
    res.status(500).json({ 
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// -------------------------------
// 🎥 GET /api/title/:type/:tmdb_id
// Get detailed information for a specific title
// -------------------------------
app.get("/api/title/:type/:tmdb_id", async (req, res) => {
  console.log("[BACKEND] /api/title - Incoming request", req.params);

  try {
    const { type, tmdb_id } = req.params;

    // Validation
    if (!type || !tmdb_id) {
      console.log("[BACKEND] /api/title - Validation failed: missing parameters");
      return res.status(400).json({ 
        ok: false,
        error: "type and tmdb_id are required",
        code: "VALIDATION_ERROR"
      });
    }

    if (!TMDB_KEY) {
      console.error("[BACKEND] /api/title - TMDB_KEY not configured");
      return res.status(500).json({ 
        ok: false,
        error: "TMDB API key not configured",
        code: "CONFIG_ERROR"
      });
    }

    console.log(`[BACKEND] /api/title - Fetching details for ${type}/${tmdb_id}...`);
    // Fetch TMDB details
    const titleData = await tmdbHelper.getTitleDetails(TMDB_KEY, tmdb_id, type);

    if (!titleData) {
      console.log("[BACKEND] /api/title - Title not found");
      return res.status(404).json({ 
        ok: false,
        error: "Title not found",
        code: "NOT_FOUND"
      });
    }

    console.log("[BACKEND] /api/title - TMDB data fetched, generating AI descriptions...");
    // Generate AI descriptions
    const [aiDescription, aiViewerFit] = await Promise.all([
      aiHelper.generateTitleDescription(
        client,
        titleData.title,
        titleData.overview,
        titleData.genres
      ),
      aiHelper.generateViewerFit(
        client,
        titleData.title,
        titleData.genres
      )
    ]);

    console.log("[BACKEND] /api/title - AI descriptions generated successfully");
    res.json({
      ok: true,
      ...titleData,
      ai_description: aiDescription,
      ai_viewer_fit: aiViewerFit
    });

  } catch (error) {
    console.error("[BACKEND] /api/title - ERROR:", error);
    console.error("[BACKEND] /api/title - Error stack:", error.stack);
    res.status(500).json({ 
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// -------------------------------
// 🌆 GET /api/discover
// Get curated discovery sections
// -------------------------------
app.get("/api/discover", async (req, res) => {
  console.log("[BACKEND] /api/discover - Incoming request");

  try {
    if (!TMDB_KEY) {
      console.error("[BACKEND] /api/discover - TMDB_KEY not configured");
      return res.status(500).json({ 
        ok: false,
        error: "TMDB API key not configured",
        code: "CONFIG_ERROR"
      });
    }

    console.log("[BACKEND] /api/discover - Fetching content from TMDB...");
    // Fetch multiple sections in parallel
    const [trending, popular, actionMovies, comedyMovies] = await Promise.all([
      tmdbHelper.getTrending(TMDB_KEY, 'all', 'week'),
      tmdbHelper.getPopularMovies(TMDB_KEY, 10),
      tmdbHelper.discoverMovies(TMDB_KEY, [28], { maxResults: 10, randomOffset: false }),
      tmdbHelper.discoverMovies(TMDB_KEY, [35], { maxResults: 10, randomOffset: false })
    ]);

    console.log(`[BACKEND] /api/discover - TMDB fetch success: trending(${trending.length}), popular(${popular.length}), action(${actionMovies.length}), comedy(${comedyMovies.length})`);

    // Generate captions for each section
    console.log("[BACKEND] /api/discover - Generating AI captions...");
    const [trendingCaption, popularCaption, actionCaption, comedyCaption] = await Promise.all([
      aiHelper.generateSectionCaption(client, "Trending Now", trending),
      aiHelper.generateSectionCaption(client, "Tonight's Picks", popular),
      aiHelper.generateSectionCaption(client, "Action & Thrills", actionMovies),
      aiHelper.generateSectionCaption(client, "Light & Funny", comedyMovies)
    ]);

    console.log("[BACKEND] /api/discover - Success! Returning sections");
    res.json({
      ok: true,
      sections: [
        {
          id: "trending",
          title: "Trending Now",
          caption: trendingCaption,
          items: trending
        },
        {
          id: "popular",
          title: "Tonight's Picks",
          caption: popularCaption,
          items: popular
        },
        {
          id: "action",
          title: "Action & Thrills",
          caption: actionCaption,
          items: actionMovies
        },
        {
          id: "comedy",
          title: "Light & Funny",
          caption: comedyCaption,
          items: comedyMovies
        }
      ]
    });

  } catch (error) {
    console.error("[BACKEND] /api/discover - ERROR:", error);
    console.error("[BACKEND] /api/discover - Error stack:", error.stack);
    res.status(500).json({ 
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// -------------------------------
// 🎭 GET /api/profile/:user_id
// Get user profile with cinema personality
// -------------------------------
app.get("/api/profile/:user_id", async (req, res) => {
  console.log("[BACKEND] /api/profile - Incoming request", req.params);

  try {
    const { user_id } = req.params;

    if (!user_id) {
      console.log("[BACKEND] /api/profile - Validation failed: missing user_id");
      return res.status(400).json({ 
        ok: false,
        error: "user_id is required",
        code: "VALIDATION_ERROR"
      });
    }

    console.log(`[BACKEND] /api/profile - Fetching data for user: ${user_id}`);
    // Fetch user data from Supabase
    const [
      { data: moodHistory },
      { data: favorites },
      { data: viewedTitles }
    ] = await Promise.all([
      supabase
        .from("mood_history")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("viewed_titles")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(10)
    ]);

    console.log(`[BACKEND] /api/profile - Supabase fetch success: mood(${moodHistory?.length || 0}), favorites(${favorites?.length || 0}), viewed(${viewedTitles?.length || 0})`);

    // Generate cinema personality if user has history
    let cinemaPersonality = "Start exploring to discover your cinema personality...";
    if (moodHistory && moodHistory.length > 0) {
      console.log("[BACKEND] /api/profile - Generating cinema personality...");
      cinemaPersonality = await aiHelper.generateCinemaPersonality(
        client,
        moodHistory,
        favorites || [],
        viewedTitles || []
      );
      console.log("[BACKEND] /api/profile - Cinema personality generated");
    }

    // Calculate mood stats
    const moodTags = {};
    const genres = {};

    if (moodHistory) {
      moodHistory.forEach(mood => {
        if (mood.mood_tags) {
          mood.mood_tags.forEach(tag => {
            moodTags[tag] = (moodTags[tag] || 0) + 1;
          });
        }
        if (mood.genres) {
          mood.genres.forEach(genre => {
            genres[genre] = (genres[genre] || 0) + 1;
          });
        }
      });
    }

    console.log("[BACKEND] /api/profile - Success! Returning profile data");
    res.json({
      ok: true,
      user_id,
      cinema_personality: cinemaPersonality,
      mood_history: moodHistory || [],
      favorites: favorites || [],
      viewed_titles: viewedTitles || [],
      stats: {
        total_moods: moodHistory ? moodHistory.length : 0,
        total_favorites: favorites ? favorites.length : 0,
        total_viewed: viewedTitles ? viewedTitles.length : 0,
        top_mood_tags: Object.entries(moodTags)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([tag, count]) => ({ tag, count })),
        top_genres: Object.entries(genres)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([genre, count]) => ({ genre, count }))
      }
    });

  } catch (error) {
    console.error("[BACKEND] /api/profile - ERROR:", error);
    console.error("[BACKEND] /api/profile - Error stack:", error.stack);
    res.status(500).json({ 
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// -------------------------------
// ⭐ POST /api/favorite
// Add/remove favorite
// -------------------------------
app.post("/api/favorite", async (req, res) => {
  console.log("[BACKEND] /api/favorite - Incoming request", req.body);

  try {
    const { user_id, tmdb_id, type, title, poster_url, action } = req.body;

    if (!user_id || !tmdb_id || !action) {
      console.log("[BACKEND] /api/favorite - Validation failed: missing required fields");
      return res.status(400).json({ 
        ok: false,
        error: "Missing required fields",
        code: "VALIDATION_ERROR"
      });
    }

    if (action === 'add') {
      console.log(`[BACKEND] /api/favorite - Adding favorite: ${title} for user ${user_id}`);
      const { error } = await supabase
        .from("favorites")
        .insert([{
          user_id,
          tmdb_id,
          type,
          title,
          poster_url
        }]);

      if (error) {
        console.error('[BACKEND] /api/favorite - Supabase add error:', error);
        return res.status(500).json({ 
          ok: false,
          error: "Server error",
          code: "DATABASE_ERROR"
        });
      }

      console.log("[BACKEND] /api/favorite - Add success");
      res.json({ ok: true, success: true, message: "Added to favorites" });
    } else if (action === 'remove') {
      console.log(`[BACKEND] /api/favorite - Removing favorite: tmdb_id ${tmdb_id} for user ${user_id}`);
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user_id)
        .eq("tmdb_id", tmdb_id);

      if (error) {
        console.error('[BACKEND] /api/favorite - Supabase remove error:', error);
        return res.status(500).json({ 
          ok: false,
          error: "Server error",
          code: "DATABASE_ERROR"
        });
      }

      console.log("[BACKEND] /api/favorite - Remove success");
      res.json({ ok: true, success: true, message: "Removed from favorites" });
    } else {
      console.log(`[BACKEND] /api/favorite - Invalid action: ${action}`);
      res.status(400).json({ 
        ok: false,
        error: "Invalid action",
        code: "VALIDATION_ERROR"
      });
    }

  } catch (error) {
    console.error("[BACKEND] /api/favorite - ERROR:", error);
    console.error("[BACKEND] /api/favorite - Error stack:", error.stack);
    res.status(500).json({ 
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// -------------------------------
// 👁 POST /api/viewed
// Mark title as viewed
// -------------------------------
app.post("/api/viewed", async (req, res) => {
  console.log("[BACKEND] /api/viewed - Incoming request", req.body);

  try {
    const { user_id, tmdb_id, type, title, poster_url } = req.body;

    if (!user_id || !tmdb_id) {
      console.log("[BACKEND] /api/viewed - Validation failed: missing required fields");
      return res.status(400).json({ 
        ok: false,
        error: "Missing required fields",
        code: "VALIDATION_ERROR"
      });
    }

    console.log(`[BACKEND] /api/viewed - Marking as viewed: ${title} for user ${user_id}`);
    const { error } = await supabase
      .from("viewed_titles")
      .insert([{
        user_id,
        tmdb_id,
        type,
        title,
        poster_url
      }]);

    if (error) {
      console.error('[BACKEND] /api/viewed - Supabase error:', error);
      return res.status(500).json({ 
        ok: false,
        error: "Server error",
        code: "DATABASE_ERROR"
      });
    }

    console.log("[BACKEND] /api/viewed - Success");
    res.json({ ok: true, success: true, message: "Marked as viewed" });

  } catch (error) {
    console.error("[BACKEND] /api/viewed - ERROR:", error);
    console.error("[BACKEND] /api/viewed - Error stack:", error.stack);
    res.status(500).json({ 
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// ===============================
// ORIGINAL CHAT ENDPOINT (PRESERVED)
// ===============================

// -------------------------------
// Chat Endpoint (Text + Image with Full Context)
// -------------------------------
app.post("/chat", async (req, res) => {
  console.log("[BACKEND] /chat - Incoming request from user:", req.body?.user_id);

  try {
    const { user_id, message, image } = req.body;

    if (!message && !image) {
      console.log("[BACKEND] /chat - Validation failed: no message or image");
      return res.status(400).json({ error: "Message or image is required" });
    }

    const userId = user_id || "guest";

    // -------------------------------
    // 1. FETCH CONVERSATION HISTORY FROM SUPABASE
    // -------------------------------
    console.log(`[BACKEND] /chat - Fetching history for user: ${userId}`);
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
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from /public`);
  console.log(`${'='.repeat(50)}`);
  console.log('\n📊 Environment Status:');
  console.log(`   ✅ OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Loaded' : '❌ Missing'}`);
  console.log(`   ✅ TMDB_API_KEY: ${process.env.TMDB_API_KEY ? 'Loaded' : '❌ Missing'}`);
  console.log(`   ✅ SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Loaded' : '❌ Missing'}`);
  console.log(`   ✅ SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Loaded' : '❌ Missing'}`);
  console.log(`${'='.repeat(50)}\n`);
});
