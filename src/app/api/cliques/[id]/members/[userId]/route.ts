import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * DELETE /api/cliques/[id]/members/[userId]
 *
 * Removes a member from a clique. Only the clique creator can remove members.
 * The creator cannot remove themselves (delete the clique instead).
 *
 * @returns {Promise<NextResponse>} Success message
 * @throws {401} If user is not authenticated
 * @throws {403} If requester is not the clique creator
 * @throws {404} If clique or member not found
 * @throws {500} If database operation fails
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = session.user.id
    const { id, userId } = await params

    const clique = await prisma.clique.findUnique({
      where: { id },
      select: { creatorId: true },
    })

    if (!clique) {
      return NextResponse.json({ error: "Clique not found" }, { status: 404 })
    }

    if (clique.creatorId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Verify the target user is a current member
    const membership = await prisma.cliqueMember.findUnique({
      where: {
        cliqueId_userId: { cliqueId: id, userId },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    await prisma.cliqueMember.delete({
      where: {
        cliqueId_userId: { cliqueId: id, userId },
      },
    })

    return NextResponse.json({ message: "Member removed" })
  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    )
  }
}
