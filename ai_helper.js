// ============================================
// AI HELPER
// Handles all OpenAI interactions for CineMood
// ============================================

/**
 * Parse mood text into structured data
 * Returns: { mood_tags: [], genres: [], avoid: [] }
 */
async function parseMood(openaiClient, moodText) {
  const systemPrompt = `You are a mood-to-genre translator for a movie recommendation system.
Extract structured data from user mood descriptions.

Rules:
1. Return ONLY valid JSON
2. mood_tags: adjectives describing the mood (lowercase, max 5)
3. genres: TMDB-compatible genre names (lowercase, from: action, adventure, animation, comedy, crime, documentary, drama, family, fantasy, history, horror, music, mystery, romance, sci-fi, thriller, war, western)
4. avoid: themes/genres to avoid (lowercase)
5. No markdown, no code blocks, no explanations

Example input: "أبغى شيء خفيف يونسني"
Example output: {"mood_tags":["light","uplifting","fun","easy","warm"],"genres":["comedy","romance"],"avoid":["dark","heavy"]}`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: moodText }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    let jsonStr = content;
    if (content.startsWith('```')) {
      jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Validate structure
    return {
      mood_tags: Array.isArray(parsed.mood_tags) ? parsed.mood_tags : [],
      genres: Array.isArray(parsed.genres) ? parsed.genres : [],
      avoid: Array.isArray(parsed.avoid) ? parsed.avoid : []
    };
  } catch (error) {
    console.error('AI parse mood error:', error);
    // Fallback to basic mood parsing
    return {
      mood_tags: ['general'],
      genres: ['drama', 'comedy'],
      avoid: []
    };
  }
}

/**
 * Generate "why it fits your mood" for each recommendation
 */
async function generateMoodFit(openaiClient, moodText, moodTags, titles) {
  const systemPrompt = `You are a cinematic copywriter for a movie recommendation app.
Given a user's mood and a list of titles, write ONE SHORT SENTENCE for each title explaining why it fits their mood.

Rules:
1. Be casual, warm, and cinematic
2. NO spoilers
3. Keep each sentence under 20 words
4. No generic statements
5. Return as JSON array: ["sentence 1", "sentence 2", ...]
6. No markdown, no code blocks`;

  const titlesText = titles.map((t, i) => `${i + 1}. ${t.title} (${t.year}) - ${t.type}`).join('\n');

  const userPrompt = `Mood: "${moodText}"
Mood tags: ${moodTags.join(', ')}

Titles:
${titlesText}

Return array of ${titles.length} sentences:`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const content = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    let jsonStr = content;
    if (content.startsWith('```')) {
      jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const sentences = JSON.parse(jsonStr);
    return Array.isArray(sentences) ? sentences : [];
  } catch (error) {
    console.error('AI generate mood fit error:', error);
    // Fallback to generic responses
    return titles.map(() => 'A great pick for your current mood.');
  }
}

/**
 * Generate cinematic description for a title
 */
async function generateTitleDescription(openaiClient, title, overview, genres) {
  const systemPrompt = `You are a cinematic film critic writing spoiler-free descriptions.
Write a beautiful, atmospheric description (3-5 sentences) that captures the essence of the film/show.

Rules:
1. Poetic but not pretentious
2. Focus on atmosphere, themes, emotions
3. NO plot spoilers
4. Make it feel immersive
5. Return plain text, no JSON`;

  const userPrompt = `Title: ${title}
Genres: ${genres.join(', ')}
Official overview: ${overview}

Write cinematic description:`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 200
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI generate title description error:', error);
    return overview;
  }
}

/**
 * Generate viewer fit description
 */
async function generateViewerFit(openaiClient, title, genres, moodTags = []) {
  const systemPrompt = `You are a movie matchmaker.
Describe what kind of viewer would enjoy this title (2-3 sentences).

Rules:
1. Be specific and insightful
2. Focus on personality, taste, viewing habits
3. Casual, friendly tone
4. Return plain text`;

  const moodContext = moodTags.length > 0 ? `User mood: ${moodTags.join(', ')}` : '';

  const userPrompt = `Title: ${title}
Genres: ${genres.join(', ')}
${moodContext}

Who would love this?`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI generate viewer fit error:', error);
    return 'Perfect for viewers who appreciate quality storytelling.';
  }
}

/**
 * Generate cinema personality based on user history
 */
async function generateCinemaPersonality(openaiClient, moodHistory, favorites, viewedTitles) {
  const systemPrompt = `You are a cinema personality analyst.
Based on user's viewing history and moods, write a fun, poetic personality profile (4-6 sentences).

Style:
1. Like a movie horoscope
2. Insightful but playful
3. Poetic without being cheesy
4. Make them feel understood
5. Return plain text`;

  const moodsText = moodHistory.slice(-10).map(m => m.mood_text).join('; ');
  const favoritesText = favorites.map(f => f.title).join(', ');
  const viewedText = viewedTitles.slice(-5).map(v => v.title).join(', ');

  const userPrompt = `Recent moods: ${moodsText || 'None yet'}
Favorites: ${favoritesText || 'None yet'}
Recently viewed: ${viewedText || 'None yet'}

Write their Cinema Personality:`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 250
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI generate cinema personality error:', error);
    return 'You are a cinema explorer with eclectic taste and an open heart. Every mood brings a new adventure, and you embrace the full spectrum of storytelling.';
  }
}

/**
 * Generate section captions for discover page
 */
async function generateSectionCaption(openaiClient, sectionName, titles) {
  const systemPrompt = `You are writing playful captions for movie carousels.
Write ONE SHORT sentence (under 12 words) that introduces this section.

Rules:
1. Be creative and inviting
2. Match the vibe of the section
3. No clichés
4. Return plain text only`;

  const titlesText = titles.slice(0, 3).map(t => t.title).join(', ');

  const userPrompt = `Section: ${sectionName}
Sample titles: ${titlesText}

Write caption:`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.9,
      max_tokens: 50
    });

    return response.choices[0].message.content.trim().replace(/['"]/g, '');
  } catch (error) {
    console.error('AI generate section caption error:', error);
    return sectionName;
  }
}

module.exports = {
  parseMood,
  generateMoodFit,
  generateTitleDescription,
  generateViewerFit,
  generateCinemaPersonality,
  generateSectionCaption
};
