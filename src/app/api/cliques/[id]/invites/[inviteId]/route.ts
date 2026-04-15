import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * DELETE /api/cliques/[id]/invites/[inviteId]
 *
 * Revokes an invite by setting its status to REVOKED.
 * Only the clique creator can revoke invites.
 *
 * @returns {Promise<NextResponse>} Success message
 * @throws {401} If unauthenticated
 * @throws {403} If requester is not the clique creator
 * @throws {404} If clique or invite not found
 * @throws {500} If database operation fails
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id, inviteId } = await params

    const clique = await prisma.clique.findUnique({
      where: { id },
      select: { creatorId: true },
    })

    if (!clique) {
      return NextResponse.json({ error: "Clique not found" }, { status: 404 })
    }

    if (clique.creatorId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const invite = await prisma.cliqueInvite.findUnique({
      where: { id: inviteId },
    })

    if (!invite || invite.cliqueId !== id) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    await prisma.cliqueInvite.update({
      where: { id: inviteId },
      data: { status: "REVOKED" },
    })

    return NextResponse.json({ message: "Invite revoked" })
  } catch (error) {
    console.error("Error revoking invite:", error)
    return NextResponse.json(
      { error: "Failed to revoke invite" },
      { status: 500 }
    )
  }
}
