# 🚀 CineMood Setup Guide

Complete step-by-step guide to set up and deploy CineMood.

## Table of Contents
1. [Getting API Keys](#getting-api-keys)
2. [Database Setup](#database-setup)
3. [Local Development](#local-development)
4. [Deployment](#deployment)
5. [Troubleshooting](#troubleshooting)

---

## 1. Getting API Keys

### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Name it "CineMood" and copy the key
6. **Important**: Save it immediately - you won't see it again!

**Cost**: Pay-as-you-go. GPT-4o costs ~$0.005 per 1K tokens.

### TMDB API Key

1. Go to [The Movie Database](https://www.themoviedb.org)
2. Create a free account
3. Go to Settings → API
4. Click "Create" under "Request an API Key"
5. Choose "Developer" option
6. Fill in:
   - **Application Name**: CineMood
   - **Application URL**: http://localhost:3000 (for development)
   - **Application Summary**: Personal movie recommendation app
7. Accept terms and submit
8. Copy your API Key (v3 auth)

**Cost**: Completely free! No credit card required.

### Supabase Setup

1. Go to [Supabase](https://supabase.com)
2. Sign up with GitHub
3. Click "New Project"
4. Fill in:
   - **Name**: cinemood
   - **Database Password**: Generate a strong password and save it
   - **Region**: Choose closest to you
5. Wait for database to provision (1-2 minutes)
6. Go to Settings → API
7. Copy:
   - **Project URL** (starts with https://...supabase.co)
   - **service_role key** (NOT the anon key!)

**Cost**: Free tier includes:
- 500 MB database
- 1 GB file storage
- 2 GB bandwidth/month

---

## 2. Database Setup

### Create Tables in Supabase

1. Open your Supabase project
2. Go to SQL Editor
3. Click "New Query"
4. Copy and paste this SQL:

```sql
-- ============================================
-- CINEMOOD DATABASE SCHEMA
-- ============================================

-- Table 1: Chat messages
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  reply TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Table 2: Mood search history
CREATE TABLE IF NOT EXISTS mood_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  mood_text TEXT NOT NULL,
  mood_tags TEXT[],
  genres TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mood_history_user_id ON mood_history(user_id);
CREATE INDEX idx_mood_history_created_at ON mood_history(created_at DESC);

-- Table 3: Recommendations given to users
CREATE TABLE IF NOT EXISTS recommendations_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  mood_id BIGINT REFERENCES mood_history(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  why_it_fits TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recommendations_user_id ON recommendations_history(user_id);
CREATE INDEX idx_recommendations_mood_id ON recommendations_history(mood_id);

-- Table 4: User favorites
CREATE TABLE IF NOT EXISTS favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tmdb_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_created_at ON favorites(created_at DESC);

-- Table 5: Viewed titles
CREATE TABLE IF NOT EXISTS viewed_titles (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_viewed_user_id ON viewed_titles(user_id);
CREATE INDEX idx_viewed_created_at ON viewed_titles(created_at DESC);

-- ============================================
-- OPTIONAL: Row Level Security (RLS)
-- Uncomment if you want to add user authentication
-- ============================================

-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mood_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recommendations_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE viewed_titles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Success message
-- ============================================
SELECT 'Database setup complete! ✅' AS status;
```

5. Click "Run" or press Ctrl+Enter
6. You should see "Database setup complete! ✅"

### Verify Tables

1. Go to Table Editor in Supabase
2. You should see 5 tables:
   - messages
   - mood_history
   - recommendations_history
   - favorites
   - viewed_titles

---

## 3. Local Development

### Step 1: Install Node.js

If you don't have Node.js installed:

1. Go to [nodejs.org](https://nodejs.org)
2. Download LTS version (recommended)
3. Install with default settings
4. Verify installation:
```bash
node --version
npm --version
```

### Step 2: Project Setup

1. Navigate to project directory:
```bash
cd Aziz_chat
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
# Copy the example file
copy .env.example .env

# Or on Mac/Linux:
cp .env.example .env
```

4. Edit `.env` file with your actual keys:
```env
OPENAI_API_KEY=sk-proj-YOUR-ACTUAL-KEY-HERE
TMDB_KEY=your-actual-tmdb-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
PORT=3000
```

### Step 3: Start Development Server

```bash
npm start
```

You should see:
```
Server running on port 3000
```

### Step 4: Test the Application

1. Open browser to http://localhost:3000
2. You should see the landing page with two options:
   - CineMood
   - Aziz Chat
3. Click "CineMood" to test the mood search
4. Try typing: "I want something light and funny"
5. Click "Find Something to Watch"

---

## 4. Deployment

### Option A: Deploy to Render (Recommended)

1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. Go to [Render.com](https://render.com)
3. Sign up with GitHub
4. Click "New +" → "Web Service"
5. Connect your repository
6. Fill in:
   - **Name**: cinemood
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
7. Add Environment Variables:
   - Click "Advanced" → "Add Environment Variable"
   - Add all variables from your `.env` file
8. Click "Create Web Service"
9. Wait for deployment (3-5 minutes)
10. Your app will be live at: https://cinemood.onrender.com

**Cost**: Free tier available!

### Option B: Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow prompts and add environment variables

### Option C: Deploy to Railway

1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables
6. Deploy automatically

---

## 5. Troubleshooting

### Common Issues

#### "Cannot find module 'openai'"
**Solution**: Run `npm install`

#### "TMDB API key not configured"
**Solution**: 
- Check `.env` file has `TMDB_KEY=...`
- Restart the server after adding key
- Verify key is correct (no extra spaces)

#### "Server error" when searching
**Solution**:
- Check OpenAI API key is valid
- Verify you have credits in OpenAI account
- Check Supabase connection (URL and key)
- Look at server console for detailed errors

#### Supabase connection fails
**Solution**:
- Verify SUPABASE_URL starts with `https://`
- Ensure you're using SERVICE_ROLE key, not ANON key
- Check project is not paused (free tier pauses after 7 days inactivity)

#### No movie posters showing
**Solution**:
- TMDB images may load slowly
- Check browser console for errors
- Verify TMDB_KEY is active
- Try a different network (some networks block TMDB)

#### OpenAI rate limit errors
**Solution**:
- You're making too many requests
- Wait a few minutes
- Upgrade OpenAI plan if needed
- Implement request caching

### Testing Endpoints

Test if server is working:

```bash
# Test basic server
curl http://localhost:3000

# Test CineMood recommend endpoint
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","mood_text":"I want something funny"}'

# Test discover endpoint
curl http://localhost:3000/api/discover

# Test chat endpoint
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","message":"Hello"}'
```

### Enable Debug Logging

Add this to your server for more detailed logs:

```javascript
// At the top of server.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

---

## 6. Production Checklist

Before deploying to production:

- [ ] All environment variables set correctly
- [ ] Database tables created and indexed
- [ ] `.env` file is in `.gitignore`
- [ ] API keys are valid and have credits
- [ ] CORS configured for your domain
- [ ] HTTPS enabled (automatic on Render/Vercel)
- [ ] Rate limiting implemented (optional but recommended)
- [ ] Error monitoring set up (e.g., Sentry)
- [ ] Database backups enabled in Supabase
- [ ] Custom domain configured (optional)

---

## 7. Next Steps

After successful setup:

1. **Customize Branding**
   - Update logo in `public/cinemood.html`
   - Modify colors in `public/cinemood.css`
   - Change app name if desired

2. **Add Authentication**
   - Implement user login/signup
   - Use Supabase Auth
   - Personalize experience per user

3. **Enhance Features**
   - Add more mood chips
   - Integrate with streaming services
   - Add social sharing
   - Implement watchlist notifications

4. **Monitor Performance**
   - Set up analytics (Google Analytics, Plausible)
   - Monitor API usage and costs
   - Track user engagement

---

## Need Help?

- Check the main [README.md](README.md) for detailed API documentation
- Review server logs for error messages
- Test each API key independently
- Ensure all dependencies are installed

**Happy Coding! 🎬✨**
