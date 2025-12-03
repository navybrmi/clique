import { NextRequest, NextResponse } from "next/server"

// Google Places API - Text Search endpoint
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

    const searchQuery = location ? `${query} restaurant in ${location}` : `${query} restaurant`
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=restaurant&key=${googleApiKey}`

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
        rating: place.rating || 0,
        reviewCount: place.user_ratings_total || 0,
        categories: place.types
          ?.filter((t: string) => !["restaurant", "food", "point_of_interest", "establishment"].includes(t))
          .map((t: string) => t.replace(/_/g, " "))
          .slice(0, 2)
          .join(", ") || "",
        location: place.formatted_address || "",
        price: place.price_level ? "$".repeat(place.price_level) : "",
        phone: "",
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
