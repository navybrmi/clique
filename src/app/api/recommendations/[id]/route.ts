import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { trackMultipleTags, decrementMultipleTags } from "@/lib/tag-service"

/**
 * GET /api/recommendations/[id]
 * 
 * Retrieves a single recommendation with complete details including:
 * - Entity information with category-specific data
 * - User details
 * - All comments with user info
 * - All upvotes with user info
 * - Engagement counts
 * 
 * Route Parameters:
 * @param {string} id - Recommendation ID
 * 
 * @returns {Promise<NextResponse>} Complete recommendation object
 * @throws {404} If recommendation is not found
 * @throws {500} If database query fails
 * 
 * @example
 * // Response includes full recommendation with:
 * // - user, entity, comments[], upvotes[], _count
 */
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

/**
 * PUT /api/recommendations/[id]
 * 
 * Updates an existing recommendation. Only the recommendation owner can update.
 * Supports updating both recommendation fields and category-specific data.
 * 
 * Route Parameters:
 * @param {string} id - Recommendation ID
 * 
 * Request Body:
 * @param {string[]} [tags] - Updated tags array
 * @param {string} [link] - External link
 * @param {string} [imageUrl] - Image URL
 * @param {number} [rating] - User rating (0-5)
 * @param {object} [restaurantData] - Restaurant fields to update
 * @param {object} [movieData] - Movie fields to update
 * @param {object} [fashionData] - Fashion fields to update
 * @param {object} [householdData] - Household fields to update
 * @param {object} [otherData] - Generic category fields to update
 * 
 * @returns {Promise<NextResponse>} Updated recommendation with all relations
 * @throws {401} If user is not authenticated
 * @throws {404} If recommendation is not found
 * @throws {403} If user is not the recommendation owner
 * @throws {500} If database operation fails
 * 
 * @example
 * // PUT /api/recommendations/rec123
 * // Body: { tags: ["Updated"], rating: 5, restaurantData: { cuisine: "Italian" } }
 */
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
      select: { 
        userId: true, 
        entityId: true,
        tags: true,
        entity: {
          select: {
            categoryId: true,
          },
        },
      },
    })

    if (!existingRecommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
    }

    if (existingRecommendation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    // Track tag changes for community tag promotion/demotion
    const oldTags = existingRecommendation.tags || []
    const newTags = body.tags || []
    const categoryId = existingRecommendation.entity.categoryId

    // Calculate which tags were added and removed
    const addedTags = newTags.filter((tag: string) => !oldTags.includes(tag))
    const removedTags = oldTags.filter((tag: string) => !newTags.includes(tag))

    // Track tag usage changes
    if (addedTags.length > 0) {
      await trackMultipleTags(addedTags, categoryId)
    }
    if (removedTags.length > 0) {
      await decrementMultipleTags(removedTags, categoryId)
    }

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

/**
 * DELETE /api/recommendations/[id]
 * 
 * Deletes a recommendation. Only the recommendation owner can delete.
 * Automatically cascades deletion to related comments and upvotes.
 * 
 * Route Parameters:
 * @param {string} id - Recommendation ID
 * 
 * @returns {Promise<NextResponse>} Success message
 * @throws {401} If user is not authenticated
 * @throws {404} If recommendation is not found
 * @throws {403} If user is not the recommendation owner
 * @throws {500} If database operation fails
 * 
 * @example
 * // DELETE /api/recommendations/rec123
 * // Response: { message: "Recommendation deleted" }
 * 
 * @note This operation cannot be undone. Related entities are not deleted.
 */
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
