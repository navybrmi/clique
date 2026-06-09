import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * POST /api/recommendations/[id]/comments?cliqueId=<id>
 *
 * Creates a new comment in a clique's exclusive thread for a recommendation.
 * Comments are clique-scoped: the caller must be a member of the given clique
 * and the recommendation must belong to that clique.
 *
 * Route Parameters:
 * @param {string} id - Recommendation ID
 *
 * Query Parameters:
 * @param {string} cliqueId - The clique whose thread the comment belongs to (required)
 *
 * Request Body:
 * @param {string} content - Comment text (required, 1-500 characters)
 *
 * @returns {Promise<NextResponse>} Created comment object with user info
 * @throws {401} If user is not authenticated
 * @throws {400} If comment is invalid or cliqueId is missing
 * @throws {403} If the user is not a member of the clique
 * @throws {404} If the recommendation does not belong to the clique
 * @throws {500} If database operation fails
 *
 * @example
 * // POST /api/recommendations/rec123/comments?cliqueId=clq1
 * // Body: { content: "Great recommendation!" }
 * // Response: { id, content, createdAt, cliqueId, user: { id, name, image } }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { content } = body

    // Validate comment content
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Comment cannot be empty" },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { error: "Comment cannot be empty" },
        { status: 400 }
      )
    }

    if (trimmedContent.length > 500) {
      return NextResponse.json(
        { error: "Comment must be 500 characters or less" },
        { status: 400 }
      )
    }

    // Comments are clique-scoped: a comment belongs to one clique's exclusive
    // thread for this recommendation. The caller must be a member of that clique
    // and the recommendation must belong to it (mirrors the upvotes gate).
    const cliqueId = request.nextUrl.searchParams.get("cliqueId")

    if (!cliqueId) {
      return NextResponse.json(
        { error: "cliqueId is required" },
        { status: 400 }
      )
    }

    const [membership, cliqueRec] = await Promise.all([
      prisma.cliqueMember.findUnique({
        where: { cliqueId_userId: { cliqueId, userId } },
        select: { userId: true },
      }),
      prisma.cliqueRecommendation.findUnique({
        where: { cliqueId_recommendationId: { cliqueId, recommendationId: id } },
        select: { recommendationId: true },
      }),
    ])

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!cliqueRec) {
      return NextResponse.json(
        { error: "Recommendation not found in clique" },
        { status: 404 }
      )
    }

    // Create comment in the clique's thread
    const comment = await prisma.comment.create({
      data: {
        content: trimmedContent,
        userId,
        recommendationId: id,
        cliqueId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    )
  }
}
