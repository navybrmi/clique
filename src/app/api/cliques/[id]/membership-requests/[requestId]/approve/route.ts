import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { LimitExceededError, hashStringToInt } from "@/lib/clique-utils"

/**
 * POST /api/cliques/[id]/membership-requests/[requestId]/approve
 *
 * Approves a pending membership request. Creator-only.
 *
 * Atomically: marks the request APPROVED, inserts a CliqueMember row, and
 * sends a CLIQUE_JOIN_APPROVED notification to the requester. Uses advisory
 * locks (user then clique, consistent with the invite-accept route) to
 * enforce the 50-member and 10-clique limits under concurrent approvals.
 *
 * @returns {Promise<NextResponse>} Success message with cliqueId
 * @throws {401} If unauthenticated
 * @throws {403} If requester is not the clique creator
 * @throws {404} If clique or request not found
 * @throws {409} If request is not PENDING, user is already a member,
 *               clique has 50 members, or user belongs to 10 cliques
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
      // Acquire advisory locks — user first (consistent ordering with invite-accept
      // route) to prevent deadlocks under concurrent approvals.
      const userLockKey = hashStringToInt(requesterId)
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${userLockKey})`

      const cliqueLockKey = hashStringToInt(cliqueId)
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${cliqueLockKey})`

      const alreadyMember = await tx.cliqueMember.findUnique({
        where: { cliqueId_userId: { cliqueId, userId: requesterId } },
        select: { cliqueId: true },
      })
      if (alreadyMember) {
        throw new LimitExceededError("User is already a member of this clique")
      }

      const memberCount = await tx.cliqueMember.count({ where: { cliqueId } })
      if (memberCount >= 50) {
        throw new LimitExceededError("This clique has reached the maximum of 50 members")
      }

      const userCliqueCount = await tx.cliqueMember.count({ where: { userId: requesterId } })
      if (userCliqueCount >= 10) {
        throw new LimitExceededError("The user already belongs to the maximum of 10 cliques")
      }

      // Atomically mark approved — only succeeds if still PENDING.
      const updated = await tx.cliqueMembershipRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: { status: "APPROVED", resolvedAt: new Date() },
      })

      if (updated.count === 0) {
        throw new LimitExceededError("Request has already been resolved")
      }

      await tx.cliqueMember.create({ data: { cliqueId, userId: requesterId } })

      await tx.notification.create({
        data: {
          userId: requesterId,
          type: "CLIQUE_JOIN_APPROVED",
          payload: {
            type: "CLIQUE_JOIN_APPROVED",
            cliqueId,
            cliqueName: clique.name,
          } as object,
        },
      })
    })

    return NextResponse.json({ message: "Request approved", cliqueId })
  } catch (error) {
    if (error instanceof LimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Error approving membership request:", error)
    return NextResponse.json(
      { error: "Failed to approve membership request" },
      { status: 500 }
    )
  }
}
