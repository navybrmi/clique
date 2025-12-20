import { NextRequest, NextResponse } from "next/server"

const TMDB_BASE_URL = "https://api.themoviedb.org/3"

/**
 * GET /api/movies/[id]
 * 
 * Retrieves detailed information for a specific movie from TMDB.
 * 
 * Route Parameters:
 * @param {string} id - TMDB movie ID
 * 
 * @returns {Promise<NextResponse>} JSON object with movie details:
 *   - title: Movie title
 *   - director: Director name (from credits)
 *   - year: Release year
 *   - genre: Comma-separated genres
 *   - duration: Formatted runtime (e.g., "2h 28min")
 *   - posterPath: Full URL to poster image (w500)
 *   - overview: Movie description
 *   - imdbLink: IMDB URL (if available)
 * 
 * @throws {500} If TMDB_API_KEY is not configured
 * @throws {404} If movie is not found on TMDB
 * @throws {500} If API request fails
 * 
 * @example
 * // GET /api/movies/27205
 * // Response: { title: "Inception", director: "Christopher Nolan", year: 2010, ... }
 * 
 * @note Results are cached for 24 hours
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const TMDB_API_KEY = process.env.TMDB_API_KEY

    if (!TMDB_API_KEY) {
      console.error("TMDB_API_KEY is not configured")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    )

    if (!response.ok) {
      console.error("TMDB API error:", response.statusText)
      return NextResponse.json({ error: "Failed to fetch movie details" }, { status: response.status })
    }

    const movie = await response.json()
    
    // Extract director from crew
    const director = movie.credits?.crew?.find((person: any) => person.job === "Director")

    // Get runtime in a readable format
    const hours = Math.floor(movie.runtime / 60)
    const minutes = movie.runtime % 60
    const duration = movie.runtime ? `${hours}h ${minutes}min` : null

    // Construct IMDB link if available
    const imdbLink = movie.imdb_id ? `https://www.imdb.com/title/${movie.imdb_id}/` : null

    const movieDetails = {
      title: movie.title,
      director: director?.name || null,
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
      genre: movie.genres?.map((g: any) => g.name).join(", ") || null,
      duration,
      posterPath: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      overview: movie.overview || null,
      imdbLink,
    }

    return NextResponse.json(movieDetails)
  } catch (error) {
    console.error("Error fetching movie details:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
