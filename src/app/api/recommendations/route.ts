import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { trackMultipleTags } from "@/lib/tag-service"

type CliqueRecommendationConflictResult = {
  recommendation: {
    id: string
    entity: {
      name: string
    }
  }
}

type CliqueRecommendationConflictDelegate = {
  findFirst: (args: {
    where: {
      cliqueId: { in: string[] }
      recommendation: {
        entity: {
          name: string
          categoryId: string
        }
      }
    }
    select: {
      recommendation: {
        select: {
          id: true
          entity: { select: { name: true } }
        }
      }
    }
  }) => Promise<CliqueRecommendationConflictResult | null>
}

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
 * The authenticated user's ID is resolved from the session — the client must not
 * supply a `userId` in the body; any body `userId` field is ignored.
 *
 * Request Body:
 * @param {string} categoryId - Category ID for the recommendation (required)
 * @param {string} [entityId] - Existing entity ID (if reusing an entity)
 * @param {string} [entityName] - Name for new entity (if creating)
 * @param {string[]} [tags] - Array of recommendation tags
 * @param {string} [link] - External link related to recommendation
 * @param {string} [imageUrl] - Image URL for the recommendation
 * @param {number} [rating] - User rating value (UI typically sends 0-10; server stores provided value)
 * @param {object} [restaurantData] - Restaurant-specific fields (if category is RESTAURANT)
 * @param {object} [movieData] - Movie-specific fields (if category is MOVIE)
 * @param {object} [fashionData] - Fashion-specific fields (if category is FASHION)
 * @param {object} [householdData] - Household-specific fields (if category is HOUSEHOLD)
 * @param {object} [otherData] - Generic category fields (if category is OTHER)
 * @param {string[]} [cliqueIds] - Cliques to add this recommendation to
 * @param {boolean} [allowDuplicateInClique] - If true, allows creating despite clique-level duplicate checks
 * @param {boolean} [forceCreateNew] - Legacy alias for allowDuplicateInClique (same behavior)
 * 
 * @returns {Promise<NextResponse>} Created recommendation with all relations
 * @throws {401} If unauthenticated
 * @throws {400} If required fields are missing or invalid
 * @throws {500} If database operation fails
 * 
 * @example
 * // Creating new restaurant recommendation:
 * // POST /api/recommendations
 * // Body: {
 * //   categoryId: "cat1",
 * //   entityName: "Joe's Pizza",
 * //   tags: ["Great crust", "Authentic"],
 * //   rating: 8,
 * //   allowDuplicateInClique: false,
 * //   restaurantData: { cuisine: "Italian", location: "NYC" }
 * // }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    const body = await request.json()
    const {
      entityName,
      entityId,
      tags,
      categoryId,
      link,
      imageUrl,
      rating,
      restaurantData,
      movieData,
      fashionData,
      householdData,
      otherData,
      cliqueIds,
      allowDuplicateInClique,
      forceCreateNew,
    } = body

    const trimmedEntityName = typeof entityName === "string" ? entityName.trim() : ""
    const hasInvalidCliqueId =
      Array.isArray(cliqueIds) &&
      cliqueIds.some((id) => typeof id !== "string" || id.trim().length === 0)

    if (hasInvalidCliqueId) {
      return NextResponse.json(
        { error: "cliqueIds must contain non-empty string IDs" },
        { status: 400 }
      )
    }

    const uniqueCliqueIds = Array.isArray(cliqueIds)
      ? Array.from(new Set(cliqueIds.map((id: string) => id.trim())))
      : []

    // Validate required fields
    if (!categoryId) {
      return NextResponse.json(
        { error: "categoryId is required" },
        { status: 400 }
      )
    }

    if (!trimmedEntityName && !entityId) {
      return NextResponse.json(
        { error: "Either entityName or entityId is required" },
        { status: 400 }
      )
    }

    if (uniqueCliqueIds.length > 0) {
      const membershipCount =
        typeof (prisma as unknown as {
          cliqueMember?: {
            count?: (args: {
              where: { userId: string; cliqueId: { in: string[] } }
            }) => Promise<number>
          }
        }).cliqueMember?.count === "function"
          ? await prisma.cliqueMember.count({
              where: {
                userId,
                cliqueId: { in: uniqueCliqueIds },
              },
            })
          : (
              await prisma.$queryRaw<{ cliqueId: string }[]>`
                SELECT "cliqueId"
                FROM "CliqueMember"
                WHERE "userId" = ${userId}
                  AND "cliqueId" IN (${Prisma.join(uniqueCliqueIds)})
              `
            ).length

      if (membershipCount !== uniqueCliqueIds.length) {
        return NextResponse.json(
          { error: "You are not a member of one or more selected cliques" },
          { status: 403 }
        )
      }
    }

    const shouldAllowDuplicateInClique =
      Boolean(allowDuplicateInClique) || Boolean(forceCreateNew)

    if (
      uniqueCliqueIds.length > 0 &&
      trimmedEntityName &&
      !entityId &&
      !shouldAllowDuplicateInClique
    ) {
      // Check whether any of the target cliques already contain a recommendation
      // for this entity. Scoping to the clique(s) prevents false conflicts when
      // the same entity has been recommended in a different clique.
      let existingCliqueRec: CliqueRecommendationConflictResult | null = null

      const cliqueRecDelegate = (
        prisma as unknown as {
          cliqueRecommendation?: Partial<CliqueRecommendationConflictDelegate>
        }
      ).cliqueRecommendation

      if (typeof cliqueRecDelegate?.findFirst === "function") {
        existingCliqueRec = await cliqueRecDelegate.findFirst({
          where: {
            cliqueId: { in: uniqueCliqueIds },
            recommendation: {
              entity: {
                name: trimmedEntityName,
                categoryId,
              },
            },
          },
          select: {
            recommendation: {
              select: {
                id: true,
                entity: { select: { name: true } },
              },
            },
          },
        })
      } else {
        const existingCliqueRecRows = await prisma.$queryRaw<
          Array<{ recommendationId: string; entityName: string }>
        >(Prisma.sql`
          SELECT
            r."id" AS "recommendationId",
            e."name" AS "entityName"
          FROM "CliqueRecommendation" cr
          INNER JOIN "Recommendation" r
            ON r."id" = cr."recommendationId"
          INNER JOIN "Entity" e
            ON e."id" = r."entityId"
          WHERE cr."cliqueId" IN (${Prisma.join(uniqueCliqueIds)})
            AND e."name" = ${trimmedEntityName}
            AND e."categoryId" = ${categoryId}
          LIMIT 1
        `)

        const existingCliqueRecRow = existingCliqueRecRows[0]
        if (existingCliqueRecRow) {
          existingCliqueRec = {
            recommendation: {
              id: existingCliqueRecRow.recommendationId,
              entity: {
                name: existingCliqueRecRow.entityName,
              },
            },
          }
        }
      }

      if (existingCliqueRec) {
        return NextResponse.json(
          {
            error: "A recommendation for this item already exists in this clique",
            code: "CLIQUE_RECOMMENDATION_EXISTS",
            conflict: true,
            existingRecommendationId: existingCliqueRec.recommendation.id,
            entityName: existingCliqueRec.recommendation.entity.name,
          },
          { status: 409 }
        )
      }
    }

    let finalEntityId = entityId

    // If entityName is provided, check if entity exists or create it
    if (!entityId && trimmedEntityName) {
      let entity = await prisma.entity.findFirst({
        where: {
          name: trimmedEntityName,
          categoryId: categoryId,
        },
      })

      if (!entity) {
        // Create new entity
        entity = await prisma.entity.create({
          data: {
            name: trimmedEntityName,
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

    if (uniqueCliqueIds.length > 0) {
      const cliqueRecommendationDelegate = (prisma as unknown as {
        cliqueRecommendation?: {
          createMany?: (args: {
            data: {
              cliqueId: string
              recommendationId: string
              addedById: string
            }[]
            skipDuplicates: boolean
          }) => Promise<{ count: number }>
        }
      }).cliqueRecommendation

      if (typeof cliqueRecommendationDelegate?.createMany === "function") {
        await cliqueRecommendationDelegate.createMany({
          data: uniqueCliqueIds.map((cliqueId: string) => ({
            cliqueId,
            recommendationId: recommendation.id,
            addedById: userId,
          })),
          skipDuplicates: true,
        })
      } else {
        for (const cliqueId of uniqueCliqueIds) {
          await prisma.$executeRaw`
            INSERT INTO "CliqueRecommendation" ("cliqueId", "recommendationId", "addedById", "addedAt")
            VALUES (${cliqueId}, ${recommendation.id}, ${userId}, NOW())
            ON CONFLICT ("cliqueId", "recommendationId") DO NOTHING
          `
        }
      }
    }

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
