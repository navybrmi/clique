import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Category } from "@prisma/client"

// GET /api/recommendations - Fetch all recommendations
export async function GET() {
  try {
    const recommendations = await prisma.recommendation.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            upvotes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    // Return more detailed error info
    return NextResponse.json(
      { 
        error: "Failed to fetch recommendations",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// POST /api/recommendations - Create a new recommendation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, category, link, imageUrl, rating, userId } = body

    // Validate required fields
    if (!title || !category || !userId) {
      return NextResponse.json(
        { error: "Title, category, and userId are required" },
        { status: 400 }
      )
    }

    // Validate category
    if (!Object.values(Category).includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      )
    }

    const recommendation = await prisma.recommendation.create({
      data: {
        title,
        description,
        category,
        link,
        imageUrl,
        rating: rating || 0,
        userId,
        // Category-specific fields
        cuisine: body.cuisine || null,
        location: body.location || null,
        priceRange: body.priceRange || null,
        hours: body.hours || null,
        director: body.director || null,
        year: body.year || null,
        genre: body.genre || null,
        duration: body.duration || null,
        movieAttributes: body.movieAttributes || [],
        brand: body.brand || null,
        price: body.price || null,
        size: body.size || null,
        color: body.color || null,
        productType: body.productType || null,
        model: body.model || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            upvotes: true,
            comments: true,
          },
        },
      },
    })

    return NextResponse.json(recommendation, { status: 201 })
  } catch (error) {
    console.error("Error creating recommendation:", error)
    return NextResponse.json(
      { error: "Failed to create recommendation" },
      { status: 500 }
    )
  }
}
