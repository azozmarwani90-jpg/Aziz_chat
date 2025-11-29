// ============================================
// TMDB API HELPER
// Handles all TMDB API interactions
// ============================================

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

// Genre ID mapping for TMDB
const GENRE_MAP = {
  'action': 28,
  'adventure': 12,
  'animation': 16,
  'comedy': 35,
  'crime': 80,
  'documentary': 99,
  'drama': 18,
  'family': 10751,
  'fantasy': 14,
  'history': 36,
  'horror': 27,
  'music': 10402,
  'mystery': 9648,
  'romance': 10749,
  'science fiction': 878,
  'sci-fi': 878,
  'thriller': 53,
  'war': 10752,
  'western': 37,
  'tv movie': 10770
};

/**
 * Convert genre names to TMDB genre IDs
 */
function mapGenresToIds(genres) {
  return genres
    .map(g => GENRE_MAP[g.toLowerCase()])
    .filter(id => id !== undefined);
}

/**
 * Discover movies based on mood parameters
 */
async function discoverMovies(apiKey, genreIds, options = {}) {
  const {
    minRating = 6.0,
    maxResults = 10,
    randomOffset = true
  } = options;

  const page = randomOffset ? Math.floor(Math.random() * 5) + 1 : 1;
  const genreQuery = genreIds.length > 0 ? `&with_genres=${genreIds.join(',')}` : '';

  const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&sort_by=popularity.desc&vote_average.gte=${minRating}&vote_count.gte=100${genreQuery}&page=${page}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) return [];

    return data.results.slice(0, maxResults).map(movie => ({
      tmdb_id: movie.id,
      type: 'movie',
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
      backdrop_url: movie.backdrop_path ? `${TMDB_BACKDROP_BASE}${movie.backdrop_path}` : null,
      overview: movie.overview,
      rating: movie.vote_average,
      popularity: movie.popularity
    }));
  } catch (error) {
    console.error('TMDB discover movies error:', error);
    return [];
  }
}

/**
 * Discover TV shows based on mood parameters
 */
async function discoverTV(apiKey, genreIds, options = {}) {
  const {
    minRating = 6.0,
    maxResults = 10,
    randomOffset = true
  } = options;

  const page = randomOffset ? Math.floor(Math.random() * 5) + 1 : 1;
  const genreQuery = genreIds.length > 0 ? `&with_genres=${genreIds.join(',')}` : '';

  const url = `${TMDB_BASE_URL}/discover/tv?api_key=${apiKey}&sort_by=popularity.desc&vote_average.gte=${minRating}&vote_count.gte=50${genreQuery}&page=${page}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) return [];

    return data.results.slice(0, maxResults).map(show => ({
      tmdb_id: show.id,
      type: 'tv',
      title: show.name,
      year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : null,
      poster_url: show.poster_path ? `${TMDB_IMAGE_BASE}${show.poster_path}` : null,
      backdrop_url: show.backdrop_path ? `${TMDB_BACKDROP_BASE}${show.backdrop_path}` : null,
      overview: show.overview,
      rating: show.vote_average,
      popularity: show.popularity
    }));
  } catch (error) {
    console.error('TMDB discover TV error:', error);
    return [];
  }
}

/**
 * Get detailed information for a specific title
 */
async function getTitleDetails(apiKey, tmdbId, type = 'movie') {
  const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${apiKey}&append_to_response=videos`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Find YouTube trailer
    let trailerKey = null;
    if (data.videos && data.videos.results) {
      const trailer = data.videos.results.find(
        v => v.type === 'Trailer' && v.site === 'YouTube'
      );
      if (trailer) trailerKey = trailer.key;
    }

    return {
      tmdb_id: data.id,
      type: type,
      title: type === 'movie' ? data.title : data.name,
      year: type === 'movie' 
        ? (data.release_date ? new Date(data.release_date).getFullYear() : null)
        : (data.first_air_date ? new Date(data.first_air_date).getFullYear() : null),
      poster_url: data.poster_path ? `${TMDB_IMAGE_BASE}${data.poster_path}` : null,
      backdrop_url: data.backdrop_path ? `${TMDB_BACKDROP_BASE}${data.backdrop_path}` : null,
      genres: data.genres ? data.genres.map(g => g.name) : [],
      rating: data.vote_average || 0,
      runtime: type === 'movie' ? data.runtime : null,
      seasons: type === 'tv' ? data.number_of_seasons : null,
      overview: data.overview || '',
      trailer_key: trailerKey,
      tagline: data.tagline || ''
    };
  } catch (error) {
    console.error('TMDB get title details error:', error);
    return null;
  }
}

/**
 * Get trending titles
 */
async function getTrending(apiKey, mediaType = 'all', timeWindow = 'week') {
  const url = `${TMDB_BASE_URL}/trending/${mediaType}/${timeWindow}?api_key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) return [];

    return data.results.slice(0, 10).map(item => ({
      tmdb_id: item.id,
      type: item.media_type || mediaType,
      title: item.title || item.name,
      year: item.release_date 
        ? new Date(item.release_date).getFullYear() 
        : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : null),
      poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
      backdrop_url: item.backdrop_path ? `${TMDB_BACKDROP_BASE}${item.backdrop_path}` : null,
      overview: item.overview,
      rating: item.vote_average
    }));
  } catch (error) {
    console.error('TMDB get trending error:', error);
    return [];
  }
}

/**
 * Get popular movies
 */
async function getPopularMovies(apiKey, limit = 10) {
  const url = `${TMDB_BASE_URL}/movie/popular?api_key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) return [];

    return data.results.slice(0, limit).map(movie => ({
      tmdb_id: movie.id,
      type: 'movie',
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
      backdrop_url: movie.backdrop_path ? `${TMDB_BACKDROP_BASE}${movie.backdrop_path}` : null,
      overview: movie.overview,
      rating: movie.vote_average
    }));
  } catch (error) {
    console.error('TMDB get popular movies error:', error);
    return [];
  }
}

/**
 * Get similar titles
 */
async function getSimilarTitles(apiKey, tmdbId, type = 'movie', limit = 10) {
  const url = `${TMDB_BASE_URL}/${type}/${tmdbId}/similar?api_key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results) return [];

    return data.results.slice(0, limit).map(item => ({
      tmdb_id: item.id,
      type: type,
      title: type === 'movie' ? item.title : item.name,
      year: type === 'movie' 
        ? (item.release_date ? new Date(item.release_date).getFullYear() : null)
        : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : null),
      poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
      overview: item.overview,
      rating: item.vote_average
    }));
  } catch (error) {
    console.error('TMDB get similar titles error:', error);
    return [];
  }
}

module.exports = {
  mapGenresToIds,
  discoverMovies,
  discoverTV,
  getTitleDetails,
  getTrending,
  getPopularMovies,
  getSimilarTitles,
  GENRE_MAP
};
