import { NextRequest, NextResponse } from "next/server"

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = "https://api.themoviedb.org/3"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("query")

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] })
    }

    if (!TMDB_API_KEY) {
      console.error("TMDB_API_KEY is not configured")
      return NextResponse.json({ results: [] })
    }

    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!response.ok) {
      console.error("TMDB API error:", response.statusText)
      return NextResponse.json({ results: [] })
    }

    const data = await response.json()
    
    // Get genre information
    const genresResponse = await fetch(
      `${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    )
    const genresData = await genresResponse.json()
    const genreMap = new Map(genresData.genres?.map((g: any) => [g.id, g.name]) || [])
    
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
    console.error("Error searching movies:", error)
    return NextResponse.json({ results: [] })
  }
}
