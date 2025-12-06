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
        entity: {
          include: {
            category: true,
            restaurant: true,
            movie: true,
            fashion: true,
            household: true,
            other: true,
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
      select: { userId: true, entityId: true },
    })

    if (!existingRecommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
    }

    if (existingRecommendation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // Update recommendation fields
    await prisma.recommendation.update({
      where: { id },
      data: {
        tags: body.tags || [],
        link: body.link || null,
        imageUrl: body.imageUrl || null,
        rating: body.rating ? parseInt(body.rating) : null,
      },
    })

    // Update category-specific data if provided
    if (body.restaurantData) {
      await prisma.restaurant.upsert({
        where: { entityId: existingRecommendation.entityId },
        update: body.restaurantData,
        create: {
          entityId: existingRecommendation.entityId,
          ...body.restaurantData,
        },
      })
    } else if (body.movieData) {
      const movieDataWithParsedYear = {
        ...body.movieData,
        year: body.movieData.year ? parseInt(body.movieData.year) : null,
      }
      await prisma.movie.upsert({
        where: { entityId: existingRecommendation.entityId },
        update: movieDataWithParsedYear,
        create: {
          entityId: existingRecommendation.entityId,
          ...movieDataWithParsedYear,
        },
      })
    } else if (body.fashionData) {
      await prisma.fashion.upsert({
        where: { entityId: existingRecommendation.entityId },
        update: body.fashionData,
        create: {
          entityId: existingRecommendation.entityId,
          ...body.fashionData,
        },
      })
    } else if (body.householdData) {
      await prisma.household.upsert({
        where: { entityId: existingRecommendation.entityId },
        update: body.householdData,
        create: {
          entityId: existingRecommendation.entityId,
          ...body.householdData,
        },
      })
    } else if (body.otherData) {
      await prisma.other.upsert({
        where: { entityId: existingRecommendation.entityId },
        update: body.otherData,
        create: {
          entityId: existingRecommendation.entityId,
          ...body.otherData,
        },
      })
    }

    // Fetch and return updated recommendation with all details
    const finalRecommendation = await prisma.recommendation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        entity: {
          include: {
            category: true,
            restaurant: true,
            movie: true,
            fashion: true,
            household: true,
            other: true,
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

    return NextResponse.json(finalRecommendation)
  } catch (error) {
    console.error("Error updating recommendation:", error)
    return NextResponse.json(
      { error: "Failed to update recommendation", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/recommendations/[id] - Delete a recommendation
export async function DELETE(
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

    await prisma.recommendation.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Recommendation deleted" })
  } catch (error) {
    console.error("Error deleting recommendation:", error)
    return NextResponse.json(
      { error: "Failed to delete recommendation" },
      { status: 500 }
    )
  }
}
