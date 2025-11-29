# 🎬 Aziz Platform - CineMood & AI Chat

A comprehensive entertainment and AI platform featuring two distinct applications:
1. **CineMood** - AI-powered mood-based movie and TV show recommendations
2. **Aziz Chat** - Conversational AI with full context memory and image support

![Status](https://img.shields.io/badge/Status-Active-success)
![Node.js](https://img.shields.io/badge/Node.js-v14+-green)
![License](https://img.shields.io/badge/License-ISC-blue)

## 🌟 Features

### CineMood
- 🎬 **Mood-Based Search**: Input how you're feeling, get perfect movie/TV matches
- 🤖 **AI-Powered Analysis**: OpenAI interprets moods and generates cinematic insights
- 🎥 **TMDB Integration**: Real movie/TV data, posters, trailers, ratings
- 📺 **Embedded Trailers**: Watch YouTube trailers directly in the interface
- ⭐ **Favorites & History**: Track your watching history and favorites
- 🎭 **Cinema Personality**: AI-generated personality profile based on your tastes
- 🌆 **Discover Section**: Curated carousels with trending and popular titles
- 💬 **AI Chat Widget**: Optional assistant for quick movie queries

### Aziz Chat
- 💬 **Full Context Conversations**: Maintains complete conversation history
- 🖼️ **Image Analysis**: Upload and discuss images with AI
- 📝 **Multi-Turn Dialogues**: Coherent conversations with memory across sessions
- 🎨 **Clean UI**: Modern chat interface with sidebar navigation
- 🔄 **Multiple Chats**: Create and manage separate conversation threads

## 🚀 Quick Start

### Prerequisites
- Node.js >= 14.0.0
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- TMDB API key ([Get free key](https://www.themoviedb.org/settings/api))
- Supabase account ([Create free account](https://supabase.com))

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd Aziz_chat
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
TMDB_API_KEY=your_tmdb_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key_here
PORT=3000
```

⚠️ **Important:** Never commit your `.env` file to GitHub!

4. **Set up Supabase database**

Run these SQL commands in your Supabase SQL editor:

```sql
-- Chat messages table
CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  reply TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CineMood: Mood history
CREATE TABLE mood_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  mood_text TEXT NOT NULL,
  mood_tags TEXT[],
  genres TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CineMood: Recommendations
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

-- CineMood: Favorites
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

-- CineMood: Viewed titles
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

5. **Start the server**
```bash
npm start
```

6. **Open your browser**
- Main landing page: `http://localhost:3000`
- CineMood: `http://localhost:3000/cinemood.html`
- Aziz Chat: `http://localhost:3000/chat.html`

## 📁 Project Structure

```
Aziz_chat/
├── server.js              # Main Express server with all endpoints
├── tmdb_helper.js         # TMDB API integration helper
├── ai_helper.js           # OpenAI integration for CineMood
├── package.json           # Node dependencies
├── .env                   # Environment variables (not in repo)
├── .gitignore            # Git ignore rules
├── public/
│   ├── index.html         # Landing page
│   ├── cinemood.html      # CineMood app interface
│   ├── cinemood.css       # CineMood styles
│   ├── cinemood.js        # CineMood functionality
│   ├── chat.html          # Chat app interface
│   ├── script.js          # Chat functionality
│   └── style.css          # Chat styles
└── README.md              # This file
```

## 🔌 API Endpoints

### CineMood Endpoints

#### POST `/api/recommend`
Get mood-based recommendations
```json
{
  "user_id": "string",
  "mood_text": "I want something light and funny"
}
```

**Response:**
```json
{
  "mood_summary": "Found 8 light, funny picks for you",
  "mood_tags": ["light", "funny"],
  "genres": ["comedy"],
  "recommendations": [...]
}
```

#### GET `/api/title/:type/:tmdb_id`
Get detailed title information with AI descriptions
- `type`: "movie" or "tv"
- `tmdb_id`: TMDB ID number

#### GET `/api/discover`
Get curated discovery sections with AI-generated captions

#### GET `/api/profile/:user_id`
Get user profile with cinema personality and statistics

#### POST `/api/favorite`
Add/remove favorites

#### POST `/api/viewed`
Mark title as viewed

### Chat Endpoints

#### POST `/chat`
Send message to AI chat with optional image
```json
{
  "user_id": "string",
  "message": "string",
  "image": "base64_data_url" (optional)
}
```

#### GET `/history/:user_id`
Get chat history for user

## 🎨 Design Philosophy

### CineMood Theme
- **Dark Cinema Aesthetic**: Deep blacks (#0c0c0c) with subtle elevations
- **Neon Accents**: Hot pink/magenta (#ff006e, #ff2e63) for energy and excitement
- **Glassmorphism**: Blur effects and translucent cards for depth
- **Cinematic Animations**: Smooth fades, slides, and hover effects
- **Gold Ratings**: Star ratings in golden accent (#ffd700)

### User Experience
- Responsive grid layouts that adapt to any screen size
- Horizontal scroll carousels with snap scrolling
- Fullscreen modals with blurred cinematic backdrops
- Floating chat widget that doesn't interfere with main UX
- Smooth transitions and delightful micro-animations

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js
- **AI**: OpenAI GPT-4o (via OpenAI SDK)
- **Movie Data**: The Movie Database (TMDB) API
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Styling**: Custom CSS with CSS Grid, Flexbox, and animations

## 🎯 Usage Examples

### CineMood: Mood-Based Search
1. Navigate to CineMood from the landing page
2. Type your mood in English or Arabic: "أبغى شيء خفيف يونسني"
3. Or click a mood chip for quick selection
4. Click "Find Something to Watch"
5. Browse AI-curated recommendations with "why it fits" explanations
6. Click any title for full details, trailer, and AI insights
7. Add to favorites or mark as viewed

### Using the Discover Section
1. Click "Discover" in the navigation
2. Scroll through curated carousels
3. Each section has AI-generated captions
4. Click any poster to see full details

### Your Cinema Profile
1. Click "Profile" in the navigation
2. Read your AI-generated cinema personality
3. View statistics on your viewing habits
4. Browse your mood history, favorites, and viewed titles

### AI Chat
1. Navigate to Aziz Chat
2. Start a new conversation or continue existing ones
3. Upload images for AI analysis (optional)
4. Chat maintains full context across the conversation

### Floating Chat Widget (in CineMood)
1. Click the pink chat bubble in bottom-right corner
2. Ask questions like:
   - "What's a good thriller like Gone Girl?"
   - "Recommend a family movie for tonight"
   - "Tell me about Inception without spoilers"

## ⚙️ Configuration

### Server Settings
Edit `server.js` to customize:
- Port number (default: 3000)
- CORS settings for production
- OpenAI model selection

### AI Behavior
Edit `ai_helper.js` to modify:
- AI prompts and personality
- Temperature settings for creativity
- Token limits for responses

### TMDB Queries
Edit `tmdb_helper.js` to adjust:
- Minimum rating thresholds
- Number of results per query
- Genre mappings

## 🔒 Security Notes

- ✅ API keys stored in `.env` file (gitignored)
- ✅ Service role key used for Supabase (secure)
- ✅ Input validation on all endpoints
- ✅ Error handling to prevent data leaks
- ⚠️ For production: Add rate limiting, authentication, and HTTPS

## 🐛 Troubleshooting

### "TMDB API key not configured"
- Ensure `TMDB_API_KEY` is set in `.env` file
- Get a free API key from themoviedb.org
- Restart the server after adding the key

### "Server error" when searching
- Check OpenAI API key is valid and has credits
- Verify Supabase connection settings
- Check server console for detailed error messages

### Images not loading
- TMDB posters may be slow on first load
- Check browser console for CORS issues
- Verify TMDB API key is active

### Chat context not working
- Ensure Supabase `messages` table exists
- Check table schema matches documentation
- Verify user_id is consistent across requests

### Mood search returns no results
- Try different mood descriptions
- Check TMDB API is accessible
- Verify genre mappings in `tmdb_helper.js`

## 🎭 Easter Eggs

CineMood includes special AI responses for certain moods:
- "I'm depressed" → Suggests uplifting, feel-good movies
- "I want something insane" → AI responds with fun, chaotic recommendations
- Empty results → "Even the universe is confused… try another mood."

## 📝 License

ISC License - Feel free to use and modify

## 👤 Author

**Aziz**

## 🙏 Acknowledgments

- OpenAI for GPT-4o API
- The Movie Database (TMDB) for comprehensive movie/TV data
- Supabase for database hosting and real-time capabilities
- The open-source community

## 🔮 Future Enhancements

- [ ] User authentication and personalized accounts
- [ ] Social features: share recommendations with friends
- [ ] Watchlist with reminders for upcoming releases
- [ ] Integration with streaming services (Netflix, Prime, etc.)
- [ ] Voice input for mood search
- [ ] Dark/Light theme toggle
- [ ] Export cinema personality as shareable image
- [ ] Multi-language support (full Arabic translation)
- [ ] Progressive Web App (PWA) for mobile installation

## 📞 Support

If you encounter issues or have questions:
1. Check the Troubleshooting section above
2. Review server console logs for errors
3. Verify all environment variables are set correctly
4. Open an issue on GitHub with detailed information

---

Made with ❤️ and 🎬 by Aziz
