import { NextRequest, NextResponse } from "next/server"

const TMDB_BASE_URL = "https://api.themoviedb.org/3"

/**
 * GET /api/movies/search
 * 
 * Searches for movies using The Movie Database (TMDB) API.
 * Returns top 5 results with enriched metadata including genres.
 * 
 * Query Parameters:
 * @param {string} query - Movie title or search term (required)
 * 
 * @returns {Promise<NextResponse>} JSON object with:
 *   - On success (200): `results` array containing:
 *     - id: TMDB movie ID
 *     - title: Movie title
 *     - year: Release year
 *     - posterPath: Full URL to poster image (w500)
 *     - overview: Movie description
 *     - genre: Comma-separated genre names
 *   - On error (500+): `results` array (empty) + `error` string with details
 * 
 * @note If the query is missing/empty, returns 200 with empty `results` array.
 * @note If TMDB_API_KEY is not configured, returns 500 with error message.
 * @note If TMDB API request fails, returns error status from TMDB with error message.
 * 
 * @example
 * // GET /api/movies/search?query=inception
 * // Success: { results: [{ id: 27205, title: "Inception", year: 2010, ... }] }
 * // Error: { results: [], error: "API key not configured" }
 * 
 * @note Search results are cached for 1 hour. Genre list is cached for 24 hours.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("query")

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] })
    }

    const TMDB_API_KEY = process.env.TMDB_API_KEY
    if (!TMDB_API_KEY) {
      console.error("[TMDB] TMDB_API_KEY is not configured")
      return NextResponse.json({ results: [], error: "API key not configured" }, { status: 500 })
    }

    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`
    
    const response = await fetch(searchUrl, { 
      next: { revalidate: 3600 } // Cache for 1 hour
    })

    if (!response.ok) {
      console.error('[TMDB] Search API error for query "%s": %d %s', query, response.status, response.statusText)
      const errorText = await response.text()
      console.error("[TMDB] Error details:", errorText)
      return NextResponse.json({ results: [], error: `TMDB API error: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()
    
    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ results: [] })
    }
    
    // Get genre information with 24-hour cache
    const genresUrl = `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
    const genresResponse = await fetch(genresUrl, {
      next: { revalidate: 86400 } // Cache for 24 hours
    })
    
    let genreMap = new Map<number, string>()
    if (genresResponse.ok) {
      const genresData = await genresResponse.json()
      genreMap = new Map(genresData.genres?.map((g: any) => [g.id, g.name]) || [])
    } else {
      console.warn("[TMDB] Failed to fetch genres:", genresResponse.statusText)
    }
    
    // Return top 5 results with relevant information
    const movies = data.results.slice(0, 5).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      overview: movie.overview,
      genre: movie.genre_ids?.map((id: number) => genreMap.get(id)).filter(Boolean).join(", ") || "",
    }))

    return NextResponse.json({ results: movies })
  } catch (error) {
    console.error("[TMDB] Error searching movies:", error)
    return NextResponse.json({ results: [], error: "Unexpected error searching movies" }, { status: 500 })
  }
}
