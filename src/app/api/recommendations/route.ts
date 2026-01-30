import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { trackMultipleTags } from "@/lib/tag-service"

/**
 * GET /api/recommendations
 * 
 * Retrieves all recommendations with complete entity details, user info, and engagement counts.
 * Results are ordered by creation date (newest first).
 * 
 * @returns {Promise<NextResponse>} JSON array of recommendations with:
 *   - User details (id, name, image)
 *   - Complete entity with category-specific data
 *   - Upvote and comment counts
 * @throws {500} If database query fails
 * 
 * @example
 * // Response includes:
 * // - recommendation.user: { id, name, image }
 * // - recommendation.entity: { ...entity, restaurant/movie/fashion/household/other }
 * // - recommendation._count: { upvotes, comments }
 */
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error("Error fetching recommendations:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch recommendations",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/recommendations
 * 
 * Creates a new recommendation with optional entity creation.
 * 
 * Request Body:
 * @param {string} userId - ID of the user creating the recommendation (required)
 * @param {string} categoryId - Category ID for the recommendation (required)
 * @param {string} [entityId] - Existing entity ID (if reusing an entity)
 * @param {string} [entityName] - Name for new entity (if creating)
 * @param {string[]} [tags] - Array of recommendation tags
 * @param {string} [link] - External link related to recommendation
 * @param {string} [imageUrl] - Image URL for the recommendation
 * @param {number} [rating] - User rating (0-5)
 * @param {object} [restaurantData] - Restaurant-specific fields (if category is RESTAURANT)
 * @param {object} [movieData] - Movie-specific fields (if category is MOVIE)
 * @param {object} [fashionData] - Fashion-specific fields (if category is FASHION)
 * @param {object} [householdData] - Household-specific fields (if category is HOUSEHOLD)
 * @param {object} [otherData] - Generic category fields (if category is OTHER)
 * 
 * @returns {Promise<NextResponse>} Created recommendation with all relations
 * @throws {400} If required fields are missing or invalid
 * @throws {500} If database operation fails
 * 
 * @example
 * // Creating new restaurant recommendation:
 * // POST /api/recommendations
 * // Body: {
 * //   userId: "user123",
 * //   categoryId: "cat1",
 * //   entityName: "Joe's Pizza",
 * //   tags: ["Great crust", "Authentic"],
 * //   rating: 5,
 * //   restaurantData: { cuisine: "Italian", location: "NYC" }
 * // }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      entityName, 
      entityId,
      tags, 
      categoryId, 
      link, 
      imageUrl, 
      rating, 
      userId,
      restaurantData,
      movieData,
      fashionData,
      householdData,
      otherData
    } = body

    // Validate required fields
    if (!userId || !categoryId) {
      return NextResponse.json(
        { error: "userId and categoryId are required" },
        { status: 400 }
      )
    }

    if (!entityName && !entityId) {
      return NextResponse.json(
        { error: "Either entityName or entityId is required" },
        { status: 400 }
      )
    }

    let finalEntityId = entityId

    // If entityName is provided, check if entity exists or create it
    if (!entityId && entityName) {
      let entity = await prisma.entity.findFirst({
        where: {
          name: entityName,
          categoryId: categoryId,
        },
      })

      if (!entity) {
        // Create new entity
        entity = await prisma.entity.create({
          data: {
            name: entityName,
            categoryId: categoryId,
          },
        })

        // Create category-specific record based on category
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        })

        if (category?.name === "RESTAURANT" && restaurantData) {
          await prisma.restaurant.create({
            data: {
              entityId: entity.id,
              ...restaurantData,
            },
          })
        } else if (category?.name === "MOVIE" && movieData) {
          await prisma.movie.create({
            data: {
              entityId: entity.id,
              ...movieData,
              year: movieData.year ? parseInt(movieData.year) : null,
            },
          })
        } else if (category?.name === "FASHION" && fashionData) {
          await prisma.fashion.create({
            data: {
              entityId: entity.id,
              ...fashionData,
            },
          })
        } else if (category?.name === "HOUSEHOLD" && householdData) {
          await prisma.household.create({
            data: {
              entityId: entity.id,
              ...householdData,
            },
          })
        } else if (category?.name === "OTHER" && otherData) {
          await prisma.other.create({
            data: {
              entityId: entity.id,
              ...otherData,
            },
          })
        }
      }

      finalEntityId = entity.id
    }

    const recommendation = await prisma.recommendation.create({
      data: {
        tags: tags || [],
        link,
        imageUrl,
        rating: rating || 0,
        userId,
        entityId: finalEntityId,
      },
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

    // Track tag usage for community tag promotion
    if (tags && tags.length > 0) {
      try {
        await trackMultipleTags(tags, categoryId)
      } catch (error) {
        // Log but don't fail the recommendation creation if tag tracking fails
        console.error("Error tracking tags:", error)
      }
    }

    return NextResponse.json(recommendation, { status: 201 })
  } catch (error) {
    console.error("Error creating recommendation:", error)
    return NextResponse.json(
      { error: "Failed to create recommendation", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
