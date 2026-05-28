import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

class AlreadyResolvedError extends Error {
  constructor(public readonly actualStatus: string) {
    super(`Request is already ${actualStatus.toLowerCase()}`)
    this.name = "AlreadyResolvedError"
  }
}

/**
 * POST /api/cliques/[id]/membership-requests/[requestId]/reject
 *
 * Rejects a pending membership request. Creator-only.
 *
 * Atomically marks the request REJECTED and sends a CLIQUE_JOIN_REJECTED
 * notification to the requester. If a concurrent operation resolved the
 * request first, re-fetches the actual status and returns 409 with the
 * correct current state rather than assuming it was also a rejection.
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
        // A concurrent operation resolved the request — re-fetch to find out
        // whether it was approved or rejected so we can return an accurate error.
        const current = await tx.cliqueMembershipRequest.findUnique({
          where: { id: requestId },
          select: { status: true },
        })
        throw new AlreadyResolvedError(current?.status ?? "UNKNOWN")
      }

      // Remove the pending join-request notification from the creator's inbox now
      // that it has been resolved, so it no longer shows stale Approve/Decline buttons.
      await tx.notification.deleteMany({
        where: {
          userId: creatorId,
          type: "CLIQUE_JOIN_REQUEST",
          payload: { path: ["requestId"], equals: requestId },
        },
      })

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
    if (error instanceof AlreadyResolvedError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Error rejecting membership request:", error)
    return NextResponse.json(
      { error: "Failed to reject membership request" },
      { status: 500 }
    )
  }
}
