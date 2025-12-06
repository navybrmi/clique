import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

// POST /api/recommendations - Create a new recommendation
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

    return NextResponse.json(recommendation, { status: 201 })
  } catch (error) {
    console.error("Error creating recommendation:", error)
    return NextResponse.json(
      { error: "Failed to create recommendation", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
