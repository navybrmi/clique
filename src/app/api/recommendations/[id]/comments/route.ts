import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * POST /api/recommendations/[id]/comments
 *
 * Creates a new comment on a recommendation.
 * Only authenticated users can add comments.
 *
 * Route Parameters:
 * @param {string} id - Recommendation ID
 *
 * Request Body:
 * @param {string} content - Comment text (required, 1-500 characters)
 *
 * @returns {Promise<NextResponse>} Created comment object with user info
 * @throws {401} If user is not authenticated
 * @throws {404} If recommendation is not found
 * @throws {400} If comment is invalid
 * @throws {500} If database operation fails
 *
 * @example
 * // POST /api/recommendations/rec123/comments
 * // Body: { content: "Great recommendation!" }
 * // Response: { id, content, createdAt, user: { id, name, image } }
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

    // Verify recommendation exists
    const recommendation = await prisma.recommendation.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!recommendation) {
      return NextResponse.json(
        { error: "Recommendation not found" },
        { status: 404 }
      )
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content: trimmedContent,
        userId: session.user.id,
        recommendationId: id,
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
