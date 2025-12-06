import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/restaurants/[id]
 * 
 * Retrieves detailed information for a specific restaurant using Google Places API.
 * 
 * Route Parameters:
 * @param {string} id - Google Place ID
 * 
 * @returns {Promise<NextResponse>} JSON object with restaurant details:
 *   - id: Google Place ID
 *   - name: Restaurant name
 *   - imageUrl: Full URL to restaurant photo (maxwidth=800)
 *   - rating: Google rating (0-5)
 *   - reviewCount: Number of reviews
 *   - cuisine: Up to 3 cuisine types (generic types filtered out)
 *   - location: Formatted address
 *   - priceRange: Price level as dollar signs (e.g., "$$") or null
 *   - phone: Formatted phone number
 *   - url: Restaurant website
 *   - hours: Opening hours formatted as comma-separated string
 * 
 * @throws {500} If GOOGLE_PLACES_API_KEY is not configured
 * @throws {500} If API request fails or returns non-OK status
 * 
 * @example
 * // GET /api/restaurants/ChIJN1t_tDeuEmsRUsoyG83frY4
 * // Response: { id: "ChIJ...", name: "Joe's Pizza", rating: 4.5, ... }
 * 
 * @note Filters out common generic place types from cuisine list
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!googleApiKey) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 })
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&fields=name,rating,formatted_address,formatted_phone_number,website,photos,price_level,opening_hours,types,user_ratings_total&key=${googleApiKey}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== "OK") {
      throw new Error(`Google Places API status: ${data.status}`)
    }

    const place = data.result

    // Transform Google Places data to our format
    const photoReference = place.photos?.[0]?.photo_reference
    const result = {
      id: id,
      name: place.name,
      imageUrl: photoReference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${googleApiKey}`
        : "",
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total || 0,
      cuisine: place.types
        ?.filter((t: string) => !["restaurant", "food", "point_of_interest", "establishment"].includes(t))
        .map((t: string) => t.replace(/_/g, " "))
        .slice(0, 3)
        .join(", ") || "",
      location: place.formatted_address || "",
      priceRange: place.price_level ? "$".repeat(place.price_level) : null,
      phone: place.formatted_phone_number || "",
      url: place.website || "",
      hours: place.opening_hours?.weekday_text?.join(", ") || null,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching restaurant details:", error)
    return NextResponse.json(
      { error: "Failed to fetch restaurant details" },
      { status: 500 }
    )
  }
}
