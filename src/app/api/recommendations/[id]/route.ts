import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/recommendations/[id] - Fetch a single recommendation by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const recommendation = await prisma.recommendation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        upvotes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
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

    if (!recommendation) {
      return NextResponse.json(
        { error: "Recommendation not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(recommendation)
  } catch (error) {
    console.error("Error fetching recommendation:", error)
    return NextResponse.json(
      { error: "Failed to fetch recommendation" },
      { status: 500 }
    )
  }
}

// PUT /api/recommendations/[id] - Update a recommendation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if the recommendation exists and belongs to the user
    const existingRecommendation = await prisma.recommendation.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingRecommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
    }

    if (existingRecommendation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // Update the recommendation
    const updatedRecommendation = await prisma.recommendation.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description || null,
        category: body.category,
        link: body.link || null,
        imageUrl: body.imageUrl || null,
        rating: body.rating ? parseInt(body.rating) : null,
        // Category-specific fields
        cuisine: body.cuisine || null,
        location: body.location || null,
        priceRange: body.priceRange || null,
        hours: body.hours || null,
        director: body.director || null,
        year: body.year ? parseInt(body.year) : null,
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
    })

    return NextResponse.json(updatedRecommendation)
  } catch (error) {
    console.error("Error updating recommendation:", error)
    return NextResponse.json(
      { error: "Failed to update recommendation" },
      { status: 500 }
    )
  }
}
