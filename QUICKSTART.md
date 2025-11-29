# ⚡ Quick Start Guide

Get CineMood running in 5 minutes!

## Prerequisites
- Node.js installed
- OpenAI API key
- TMDB API key
- Supabase account

## 1. Install Dependencies
```bash
npm install
```

## 2. Set Up Environment
```bash
# Copy example file
copy .env.example .env

# Edit .env with your keys:
# - OPENAI_API_KEY
# - TMDB_API_KEY
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

## 3. Create Database Tables

Go to your Supabase SQL Editor and run:

```sql
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  reply TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE mood_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  mood_text TEXT NOT NULL,
  mood_tags TEXT[],
  genres TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE recommendations_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  mood_id BIGINT REFERENCES mood_history(id),
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  why_it_fits TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  poster_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tmdb_id)
);

CREATE TABLE viewed_titles (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  poster_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. Start Server
```bash
npm start
```

## 5. Open Browser
Navigate to: **http://localhost:3000**

## Test It!
1. Click "CineMood"
2. Type: "I want something funny"
3. Click "Find Something to Watch"
4. Enjoy! 🎬

---

**Need more details?** Check [SETUP_GUIDE.md](SETUP_GUIDE.md)

**Having issues?** See Troubleshooting in [README.md](README.md)
