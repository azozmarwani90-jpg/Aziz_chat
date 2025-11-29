const express = require("express");
const cors = require("cors");
require("dotenv").config();
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

// CineMood Helpers
const tmdbHelper = require("./tmdb_helper");
const aiHelper = require("./ai_helper");

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
// TMDB API Key
// -------------------------------
const TMDB_KEY = process.env.TMDB_KEY;

// ===============================
// CINEMOOD API ENDPOINTS
// ===============================

// -------------------------------
// 🎬 POST /api/recommend
// Main mood-based recommendation endpoint
// -------------------------------
app.post("/api/recommend", async (req, res) => {
  try {
    const { user_id, mood_text } = req.body;

    if (!mood_text) {
      return res.status(400).json({ error: "mood_text is required" });
    }

    if (!TMDB_KEY) {
      return res.status(500).json({ error: "TMDB API key not configured" });
    }

    const userId = user_id || "guest";

    console.log(`🎬 Processing mood: "${mood_text}" for user: ${userId}`);

    // STEP 1: Parse mood with AI
    const moodData = await aiHelper.parseMood(client, mood_text);
    console.log('Parsed mood:', moodData);

    // STEP 2: Get genre IDs for TMDB
    const genreIds = tmdbHelper.mapGenresToIds(moodData.genres);

    // STEP 3: Fetch titles from TMDB (mix of movies and TV)
    const [movies, tvShows] = await Promise.all([
      tmdbHelper.discoverMovies(TMDB_KEY, genreIds, { maxResults: 6 }),
      tmdbHelper.discoverTV(TMDB_KEY, genreIds, { maxResults: 4 })
    ]);

    let allTitles = [...movies, ...tvShows];

    // Shuffle for variety
    allTitles = allTitles.sort(() => Math.random() - 0.5).slice(0, 8);

    if (allTitles.length === 0) {
      return res.json({
        mood_summary: "Even the universe is confused… try another mood.",
        recommendations: []
      });
    }

    // STEP 4: Generate AI commentary for each title
    const whyItFits = await aiHelper.generateMoodFit(
      client,
      mood_text,
      moodData.mood_tags,
      allTitles
    );

    // Attach why_it_fits to each title
    const recommendations = allTitles.map((title, index) => ({
      ...title,
      why_it_fits: whyItFits[index] || 'A great match for your mood.'
    }));

    // STEP 5: Save to Supabase
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
      console.error('Supabase mood_history error:', moodError);
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
        console.error('Supabase recommendations_history error:', recsError);
      }
    }

    // STEP 6: Return response
    res.json({
      mood_summary: `Found ${recommendations.length} ${moodData.mood_tags.join(', ')} picks for you`,
      mood_tags: moodData.mood_tags,
      genres: moodData.genres,
      recommendations
    });

  } catch (error) {
    console.error("Recommend error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------------------
// 🎥 GET /api/title/:type/:tmdb_id
// Get detailed information for a specific title
// -------------------------------
app.get("/api/title/:type/:tmdb_id", async (req, res) => {
  try {
    const { type, tmdb_id } = req.params;

    if (!TMDB_KEY) {
      return res.status(500).json({ error: "TMDB API key not configured" });
    }

    // Fetch TMDB details
    const titleData = await tmdbHelper.getTitleDetails(TMDB_KEY, tmdb_id, type);

    if (!titleData) {
      return res.status(404).json({ error: "Title not found" });
    }

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

    res.json({
      ...titleData,
      ai_description: aiDescription,
      ai_viewer_fit: aiViewerFit
    });

  } catch (error) {
    console.error("Title details error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------------------
// 🌆 GET /api/discover
// Get curated discovery sections
// -------------------------------
app.get("/api/discover", async (req, res) => {
  try {
    if (!TMDB_KEY) {
      return res.status(500).json({ error: "TMDB API key not configured" });
    }

    // Fetch multiple sections in parallel
    const [trending, popular, actionMovies, comedyMovies] = await Promise.all([
      tmdbHelper.getTrending(TMDB_KEY, 'all', 'week'),
      tmdbHelper.getPopularMovies(TMDB_KEY, 10),
      tmdbHelper.discoverMovies(TMDB_KEY, [28], { maxResults: 10, randomOffset: false }),
      tmdbHelper.discoverMovies(TMDB_KEY, [35], { maxResults: 10, randomOffset: false })
    ]);

    // Generate captions for each section
    const [trendingCaption, popularCaption, actionCaption, comedyCaption] = await Promise.all([
      aiHelper.generateSectionCaption(client, "Trending Now", trending),
      aiHelper.generateSectionCaption(client, "Tonight's Picks", popular),
      aiHelper.generateSectionCaption(client, "Action & Thrills", actionMovies),
      aiHelper.generateSectionCaption(client, "Light & Funny", comedyMovies)
    ]);

    res.json({
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
    console.error("Discover error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------------------
// 🎭 GET /api/profile/:user_id
// Get user profile with cinema personality
// -------------------------------
app.get("/api/profile/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;

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

    // Generate cinema personality if user has history
    let cinemaPersonality = "Start exploring to discover your cinema personality...";
    if (moodHistory && moodHistory.length > 0) {
      cinemaPersonality = await aiHelper.generateCinemaPersonality(
        client,
        moodHistory,
        favorites || [],
        viewedTitles || []
      );
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

    res.json({
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
    console.error("Profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------------------
// ⭐ POST /api/favorite
// Add/remove favorite
// -------------------------------
app.post("/api/favorite", async (req, res) => {
  try {
    const { user_id, tmdb_id, type, title, poster_url, action } = req.body;

    if (!user_id || !tmdb_id || !action) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (action === 'add') {
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
        console.error('Add favorite error:', error);
        return res.status(500).json({ error: "Server error" });
      }

      res.json({ success: true, message: "Added to favorites" });
    } else if (action === 'remove') {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user_id)
        .eq("tmdb_id", tmdb_id);

      if (error) {
        console.error('Remove favorite error:', error);
        return res.status(500).json({ error: "Server error" });
      }

      res.json({ success: true, message: "Removed from favorites" });
    } else {
      res.status(400).json({ error: "Invalid action" });
    }

  } catch (error) {
    console.error("Favorite error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------------------
// 👁 POST /api/viewed
// Mark title as viewed
// -------------------------------
app.post("/api/viewed", async (req, res) => {
  try {
    const { user_id, tmdb_id, type, title, poster_url } = req.body;

    if (!user_id || !tmdb_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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
      console.error('Mark viewed error:', error);
      return res.status(500).json({ error: "Server error" });
    }

    res.json({ success: true, message: "Marked as viewed" });

  } catch (error) {
    console.error("Viewed error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// ORIGINAL CHAT ENDPOINT (PRESERVED)
// ===============================

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
