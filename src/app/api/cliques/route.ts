import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { CliqueWithMemberCount } from "@/types/clique"

/**
 * GET /api/cliques
 *
 * Lists all cliques the current user belongs to (created + joined).
 *
 * @returns {Promise<NextResponse>} JSON array of cliques with member counts
 * @throws {401} If user is not authenticated
 * @throws {500} If database query fails
 */
export async function GET(): Promise<NextResponse<CliqueWithMemberCount[] | { error: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cliques = await prisma.clique.findMany({
      where: {
        members: {
          some: { userId: session.user.id },
        },
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(cliques)
  } catch (error) {
    console.error("Error fetching cliques:", error)
    return NextResponse.json(
      { error: "Failed to fetch cliques" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cliques
 *
 * Creates a new clique. The creator is automatically added as a member.
 * Enforces a 10-clique limit per user using a PostgreSQL advisory lock
 * to prevent race conditions.
 *
 * Request Body:
 * @param {string} name - Name of the clique (required)
 *
 * @returns {Promise<NextResponse>} Created clique with member count
 * @throws {401} If user is not authenticated
 * @throws {400} If name is missing or empty
 * @throws {409} If user already belongs to 10 cliques
 * @throws {500} If database operation fails
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Use a transaction with advisory lock to enforce the 10-clique limit
    // The advisory lock key is derived from a hash of the userId to avoid races
    const clique = await prisma.$transaction(async (tx) => {
      // Acquire a transaction-scoped advisory lock keyed by a hash of userId
      const lockKey = hashStringToInt(userId)
      await tx.$queryRawUnsafe(
        `SELECT pg_advisory_xact_lock($1)`,
        lockKey
      )

      // Count cliques this user belongs to
      const membershipCount = await tx.cliqueMember.count({
        where: { userId },
      })

      if (membershipCount >= 10) {
        throw new LimitExceededError("You can belong to a maximum of 10 cliques")
      }

      // Create the clique and add the creator as a member
      const created = await tx.clique.create({
        data: {
          name: name.trim(),
          creatorId: userId,
          members: {
            create: { userId },
          },
        },
        include: {
          _count: {
            select: { members: true },
          },
        },
      })

      return created
    })

    return NextResponse.json(clique, { status: 201 })
  } catch (error) {
    if (error instanceof LimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Error creating clique:", error)
    return NextResponse.json(
      { error: "Failed to create clique" },
      { status: 500 }
    )
  }
}

class LimitExceededError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LimitExceededError"
  }
}

/**
 * Converts a string to a stable 32-bit integer for use as a PostgreSQL advisory lock key.
 */
function hashStringToInt(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash
}
