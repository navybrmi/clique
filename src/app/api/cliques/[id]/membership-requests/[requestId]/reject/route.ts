import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * POST /api/cliques/[id]/membership-requests/[requestId]/reject
 *
 * Rejects a pending membership request. Creator-only.
 *
 * Atomically marks the request REJECTED and sends a CLIQUE_JOIN_REJECTED
 * notification to the requester.
 *
 * @returns {Promise<NextResponse>} Success message
 * @throws {401} If unauthenticated
 * @throws {403} If requester is not the clique creator
 * @throws {404} If clique or request not found
 * @throws {409} If request is not PENDING
 * @throws {500} If database operation fails
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const creatorId = session.user.id
    const { id: cliqueId, requestId } = await params

    const [clique, membershipRequest] = await Promise.all([
      prisma.clique.findUnique({
        where: { id: cliqueId },
        select: { creatorId: true, name: true },
      }),
      prisma.cliqueMembershipRequest.findUnique({
        where: { id: requestId },
        select: { id: true, cliqueId: true, userId: true, status: true },
      }),
    ])

    if (!clique) {
      return NextResponse.json({ error: "Clique not found" }, { status: 404 })
    }

    if (clique.creatorId !== creatorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!membershipRequest || membershipRequest.cliqueId !== cliqueId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (membershipRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `Request is already ${membershipRequest.status.toLowerCase()}` },
        { status: 409 }
      )
    }

    const requesterId = membershipRequest.userId

    await prisma.$transaction(async (tx) => {
      const updated = await tx.cliqueMembershipRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: { status: "REJECTED", resolvedAt: new Date() },
      })

      if (updated.count === 0) {
        // Another concurrent rejection won the race — treat as success
        return
      }

      await tx.notification.create({
        data: {
          userId: requesterId,
          type: "CLIQUE_JOIN_REJECTED",
          payload: {
            type: "CLIQUE_JOIN_REJECTED",
            cliqueId,
            cliqueName: clique.name,
          } as object,
        },
      })
    })

    return NextResponse.json({ message: "Request rejected" })
  } catch (error) {
    console.error("Error rejecting membership request:", error)
    return NextResponse.json(
      { error: "Failed to reject membership request" },
      { status: 500 }
    )
  }
}
