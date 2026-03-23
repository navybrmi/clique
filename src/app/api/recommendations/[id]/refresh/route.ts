import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3"
const GOOGLE_PLACES_BASE_URL = process.env.GOOGLE_PLACES_BASE_URL || "https://maps.googleapis.com"

const GENERIC_PLACE_TYPES = [
  "restaurant", "food", "point_of_interest", "establishment",
  "meal_delivery", "meal_takeaway", "store", "health",
]

function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/**
 * POST /api/recommendations/[id]/refresh
 *
 * Re-fetches the latest external data for a recommendation's entity from
 * TMDB (movies) or Google Places (restaurants) and updates the database
 * in-place. Only the recommendation owner can trigger a refresh.
 *
 * Route Parameters:
 * @param {string} id - Recommendation ID
 *
 * @returns {Promise<NextResponse>} JSON object with:
 *   - updatedFields: string[] — field names that were refreshed from the API
 *   - entity: updated entity data (name + movie or restaurant sub-object)
 *   - imageUrl: updated recommendation image URL
 *
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not the recommendation owner
 * @throws {404} If recommendation is not found
 * @throws {400} If category is not MOVIE or RESTAURANT, or external ID is missing
 * @throws {502} If the external API call fails
 * @throws {500} If a database operation fails
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const recommendation = await prisma.recommendation.findUnique({
      where: { id },
      select: {
        userId: true,
        entityId: true,
        imageUrl: true,
        entity: {
          select: {
            name: true,
            category: { select: { name: true } },
            movie: true,
            restaurant: true,
          },
        },
      },
    })

    if (!recommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
    }

    if (recommendation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const categoryName = recommendation.entity.category.name

    if (categoryName !== "MOVIE" && categoryName !== "RESTAURANT") {
      return NextResponse.json(
        { error: "Refresh is only supported for movies and restaurants" },
        { status: 400 }
      )
    }

    if (categoryName === "MOVIE") {
      return await refreshMovie(id, recommendation)
    } else {
      return await refreshRestaurant(id, recommendation)
    }
  } catch (error) {
    console.error("[Refresh] Unexpected error:", error)
    return NextResponse.json(
      { error: "Failed to refresh recommendation" },
      { status: 500 }
    )
  }
}

async function lookupTmdbId(name: string, year: number | null, apiKey: string): Promise<string | null> {
  const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(name)}&language=en-US&page=1&include_adult=false`
  const searchResponse = await fetch(searchUrl)
  if (!searchResponse.ok) return null

  const searchData = await searchResponse.json()
  const results: Array<{ id: number; title: string; release_date?: string }> = searchData.results ?? []
  if (results.length === 0) return null

  // Prefer a result whose title and year both match; fall back to top result
  if (year) {
    const yearMatch = results.find((r) => {
      const releaseYear = r.release_date ? new Date(r.release_date).getFullYear() : null
      return releaseYear === year && r.title.toLowerCase() === name.toLowerCase()
    })
    if (yearMatch) return String(yearMatch.id)
  }

  return String(results[0].id)
}

async function refreshMovie(
  recommendationId: string,
  recommendation: {
    entityId: string
    imageUrl: string | null
    entity: {
      name: string
      movie: {
        tmdbId: string | null
        imdbId: string | null
        year: number | null
        genre: string | null
        duration: string | null
        director: string | null
        attributes: string[]
      } | null
    }
  }
) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "TMDB API key not configured" }, { status: 500 })
  }

  let tmdbId = recommendation.entity.movie?.tmdbId ?? null

  // If tmdbId is missing, look it up by movie name and backfill it
  if (!tmdbId) {
    tmdbId = await lookupTmdbId(
      recommendation.entity.name,
      recommendation.entity.movie?.year ?? null,
      apiKey
    )

    if (!tmdbId) {
      return NextResponse.json(
        { error: "Could not find this movie on TMDB — try editing the recommendation to re-select the movie from search" },
        { status: 400 }
      )
    }

    // Persist the discovered tmdbId immediately so future refreshes are instant
    await prisma.movie.update({
      where: { entityId: recommendation.entityId },
      data: { tmdbId },
    })
  }

  const tmdbUrl = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${apiKey}&language=en-US`
  const tmdbResponse = await fetch(tmdbUrl)

  if (!tmdbResponse.ok) {
    console.error("[Refresh] TMDB API error:", tmdbResponse.status, tmdbResponse.statusText)
    return NextResponse.json(
      { error: `Failed to fetch movie data from TMDB: ${tmdbResponse.statusText}` },
      { status: 502 }
    )
  }

  const tmdbData = await tmdbResponse.json()

  // Build update payloads — only include fields where the API returned a value
  const entityUpdate: { name?: string } = {}
  const movieUpdate: {
    year?: number
    genre?: string
    duration?: string
    imdbId?: string
  } = {}
  let newImageUrl: string | null = recommendation.imageUrl ?? null

  const updatedFields: string[] = []

  if (tmdbData.title) {
    entityUpdate.name = tmdbData.title
    updatedFields.push("name")
  }

  const year = tmdbData.release_date
    ? new Date(tmdbData.release_date).getFullYear()
    : null
  if (year) {
    movieUpdate.year = year
    updatedFields.push("year")
  }

  const genre = (tmdbData.genres as { id: number; name: string }[] | undefined)
    ?.map((g) => g.name)
    .filter(Boolean)
    .join(", ")
  if (genre) {
    movieUpdate.genre = genre
    updatedFields.push("genre")
  }

  const duration = formatRuntime(tmdbData.runtime)
  if (duration) {
    movieUpdate.duration = duration
    updatedFields.push("duration")
  }

  if (tmdbData.imdb_id) {
    movieUpdate.imdbId = tmdbData.imdb_id
    updatedFields.push("imdbId")
  }

  if (tmdbData.poster_path) {
    newImageUrl = `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
    updatedFields.push("imageUrl")
  }

  // Persist all updates in a transaction
  await prisma.$transaction(async (tx) => {
    if (Object.keys(entityUpdate).length > 0) {
      await tx.entity.update({
        where: { id: recommendation.entityId },
        data: entityUpdate,
      })
    }

    if (Object.keys(movieUpdate).length > 0) {
      await tx.movie.update({
        where: { entityId: recommendation.entityId },
        data: movieUpdate,
      })
    }

    if (updatedFields.includes("imageUrl")) {
      await tx.recommendation.update({
        where: { id: recommendationId },
        data: { imageUrl: newImageUrl },
      })
    }
  })

  // Fetch and return the refreshed data
  const updated = await prisma.recommendation.findUnique({
    where: { id: recommendationId },
    select: {
      imageUrl: true,
      entity: {
        select: {
          name: true,
          movie: {
            select: {
              year: true,
              genre: true,
              duration: true,
              tmdbId: true,
              imdbId: true,
              director: true,
              attributes: true,
            },
          },
        },
      },
    },
  })

  return NextResponse.json({
    updatedFields,
    entity: updated?.entity,
    imageUrl: updated?.imageUrl,
  })
}

async function refreshRestaurant(
  recommendationId: string,
  recommendation: {
    entityId: string
    imageUrl: string | null
    entity: {
      name: string
      restaurant: {
        placeId: string | null
        cuisine: string | null
        location: string | null
        priceRange: string | null
        phoneNumber: string | null
        hours: string | null
      } | null
    }
  }
) {
  const placeId = recommendation.entity.restaurant?.placeId
  if (!placeId) {
    return NextResponse.json(
      { error: "No Google Place ID found for this restaurant — cannot refresh" },
      { status: 400 }
    )
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 })
  }

  const fields = "name,formatted_address,types,price_level,formatted_phone_number,opening_hours,photos"
  const placesUrl = `${GOOGLE_PLACES_BASE_URL}/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`
  const placesResponse = await fetch(placesUrl)

  if (!placesResponse.ok) {
    console.error("[Refresh] Google Places API error:", placesResponse.status, placesResponse.statusText)
    return NextResponse.json(
      { error: `Failed to fetch restaurant data from Google Places: ${placesResponse.statusText}` },
      { status: 502 }
    )
  }

  const placesData = await placesResponse.json()

  if (placesData.status !== "OK") {
    console.error("[Refresh] Google Places API status:", placesData.status)
    return NextResponse.json(
      { error: `Google Places API returned status: ${placesData.status}` },
      { status: 502 }
    )
  }

  const place = placesData.result

  // Build update payloads — only include fields where the API returned a value
  const entityUpdate: { name?: string } = {}
  const restaurantUpdate: {
    cuisine?: string
    location?: string
    priceRange?: string
    phoneNumber?: string
    hours?: string
  } = {}
  let newImageUrl: string | null = recommendation.imageUrl ?? null

  const updatedFields: string[] = []

  if (place.name) {
    entityUpdate.name = place.name
    updatedFields.push("name")
  }

  if (place.formatted_address) {
    restaurantUpdate.location = place.formatted_address
    updatedFields.push("location")
  }

  const cuisine = (place.types as string[] | undefined)
    ?.filter((t) => !GENERIC_PLACE_TYPES.includes(t))
    .map((t) => t.replace(/_/g, " "))
    .slice(0, 2)
    .join(", ")
  if (cuisine) {
    restaurantUpdate.cuisine = cuisine
    updatedFields.push("cuisine")
  }

  if (place.price_level != null) {
    restaurantUpdate.priceRange = "$".repeat(place.price_level)
    updatedFields.push("priceRange")
  }

  if (place.formatted_phone_number) {
    restaurantUpdate.phoneNumber = place.formatted_phone_number
    updatedFields.push("phoneNumber")
  }

  if (place.opening_hours?.weekday_text?.length) {
    restaurantUpdate.hours = (place.opening_hours.weekday_text as string[]).join("\n")
    updatedFields.push("hours")
  }

  const photoRef = place.photos?.[0]?.photo_reference
  if (photoRef) {
    newImageUrl = `${GOOGLE_PLACES_BASE_URL}/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${apiKey}`
    updatedFields.push("imageUrl")
  }

  // Persist all updates in a transaction
  await prisma.$transaction(async (tx) => {
    if (Object.keys(entityUpdate).length > 0) {
      await tx.entity.update({
        where: { id: recommendation.entityId },
        data: entityUpdate,
      })
    }

    if (Object.keys(restaurantUpdate).length > 0) {
      await tx.restaurant.update({
        where: { entityId: recommendation.entityId },
        data: restaurantUpdate,
      })
    }

    if (updatedFields.includes("imageUrl")) {
      await tx.recommendation.update({
        where: { id: recommendationId },
        data: { imageUrl: newImageUrl },
      })
    }
  })

  // Fetch and return the refreshed data
  const updated = await prisma.recommendation.findUnique({
    where: { id: recommendationId },
    select: {
      imageUrl: true,
      entity: {
        select: {
          name: true,
          restaurant: {
            select: {
              cuisine: true,
              location: true,
              priceRange: true,
              phoneNumber: true,
              hours: true,
              placeId: true,
            },
          },
        },
      },
    },
  })

  return NextResponse.json({
    updatedFields,
    entity: updated?.entity,
    imageUrl: updated?.imageUrl,
  })
}
