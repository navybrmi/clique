import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/restaurants/search
 * 
 * Searches for restaurants using Google Places API Text Search.
 * Returns top 5 results with photos and detailed information.
 * 
 * Query Parameters:
 * @param {string} query - Restaurant name or search term (required)
 * @param {string} [location] - Optional location to narrow search (e.g., "New York")
 * 
 * @returns {Promise<NextResponse>} JSON object with results array containing:
 *   - id: Google Place ID
 *   - name: Restaurant name
 *   - imageUrl: Full URL to restaurant photo (maxwidth=400)
 *   - location: Formatted address
 *   - categories: Up to 2 cuisine types (excluding generic types)
 *   - price: Price level as dollar signs (e.g., "$$")
 *   - rating: Google rating (0-5)
 *   - reviewCount: Number of reviews
 *   - phone: Formatted phone number
 * 
 * @throws {400} If query parameter is missing
 * @throws {500} If GOOGLE_PLACES_API_KEY is not configured
 * @throws {500} If API request fails or returns non-OK status
 * 
 * @example
 * // GET /api/restaurants/search?query=pizza&location=NYC
 * // Response: { results: [{ id: "ChIJ...", name: "Joe's Pizza", ... }] }
 * 
 * @note Filters out common generic place types from categories
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("query")
    const location = searchParams.get("location") || ""

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!googleApiKey) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 })
    }

    const GOOGLE_PLACES_BASE_URL = process.env.GOOGLE_PLACES_BASE_URL || "https://maps.googleapis.com"
    const searchQuery = location ? `${query} restaurant in ${location}` : `${query} restaurant`
    const url = `${GOOGLE_PLACES_BASE_URL}/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=restaurant&key=${googleApiKey}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places API status: ${data.status}`)
    }

    // Transform Google Places data to our format
    const results = (data.results || []).slice(0, 5).map((place: any) => {
      const photoReference = place.photos?.[0]?.photo_reference
      return {
        id: place.place_id,
        name: place.name,
        imageUrl: photoReference
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${googleApiKey}`
          : "",
        location: place.formatted_address || "",
        categories: place.types
          ?.filter((t: string) => !["restaurant", "food", "point_of_interest", "establishment", "meal_delivery", "meal_takeaway", "store", "health"].includes(t))
          .map((t: string) => t.replace(/_/g, " "))
          .slice(0, 2)
          .join(", ") || "",
        price: place.price_level ? "$".repeat(place.price_level) : "",
        rating: place.rating || 0,
        reviewCount: place.user_ratings_total || 0,
        phone: place.formatted_phone_number || "",
      }
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Error searching restaurants:", error)
    return NextResponse.json(
      { error: "Failed to search restaurants" },
      { status: 500 }
    )
  }
}
