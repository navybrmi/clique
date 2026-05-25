import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { CliqueMembershipRequest } from "@/types/clique"

/**
 * GET /api/cliques/[id]/membership-requests
 *
 * Lists all PENDING membership requests for a clique. Creator-only.
 *
 * @returns {Promise<NextResponse>} Array of pending requests with requester info
 * @throws {401} If unauthenticated
 * @throws {403} If requester is not the clique creator
 * @throws {404} If clique not found
 * @throws {500} If database query fails
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CliqueMembershipRequest[] | { error: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id } = await params

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

    const requests = await prisma.cliqueMembershipRequest.findMany({
      where: { cliqueId: id, status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(requests as CliqueMembershipRequest[])
  } catch (error) {
    console.error("Error fetching membership requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch membership requests" },
      { status: 500 }
    )
  }
}
