import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * DELETE /api/recommendations/[id]/comments/[commentId]
 * 
 * Deletes a comment if the user is authenticated and owns the comment.
 * 
 * Route Parameters:
 * @param {string} id - Recommendation ID
 * @param {string} commentId - Comment ID to delete
 * 
 * Security:
 * - User must be authenticated (401)
 * - User must own the comment (403)
 * 
 * @returns {Promise<NextResponse>} 200 with deleted comment or error
 * @throws {401} If user is not authenticated
 * @throws {403} If user doesn't own the comment
 * @throws {404} If comment is not found
 * @throws {500} If database operation fails
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: recommendationId, commentId } = await params

    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Find the comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    })

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      )
    }

    // Check if comment belongs to the recommendation
    if (comment.recommendationId !== recommendationId) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      )
    }

    // Check if user owns the comment
    if (comment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Delete the comment
    const deletedComment = await prisma.comment.delete({
      where: { id: commentId },
    })

    return NextResponse.json(deletedComment)
  } catch (error) {
    console.error("Error deleting comment:", error)
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    )
  }
}
