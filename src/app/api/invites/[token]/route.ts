import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { LimitExceededError, hashStringToInt } from "@/lib/clique-utils"
import type { CliqueInviteLookup } from "@/types/clique"

/**
 * GET /api/invites/[token]
 *
 * Public endpoint to look up an invite by token.
 * Returns minimal info: clique name, status, and expiry. No auth required.
 *
 * @returns {Promise<NextResponse>} Invite lookup result (no internal IDs)
 * @throws {404} If token not found
 * @throws {500} If database query fails
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse<CliqueInviteLookup | { error: string }>> {
  try {
    const { token } = await params

    const invite = await prisma.cliqueInvite.findUnique({
      where: { token },
      include: {
        clique: { select: { name: true } },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    const result: CliqueInviteLookup = {
      cliqueName: invite.clique.name,
      status: invite.status,
      expiresAt: invite.expiresAt,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error looking up invite:", error)
    return NextResponse.json(
      { error: "Failed to look up invite" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invites/[token]
 *
 * Accepts an invite. The current user is added as a clique member and the
 * invite is marked ACCEPTED (single-use).
 *
 * Enforces both the 50-member limit (per-clique) and the 10-clique limit
 * (per-user) using PostgreSQL advisory locks to prevent race conditions.
 * Both checks happen inside the transaction while locks are held.
 *
 * Invite status is re-verified inside the transaction with an atomic
 * conditional update (`updateMany` where status=PENDING) to ensure
 * single-use even under concurrent requests.
 *
 * @returns {Promise<NextResponse>} Success message with cliqueId
 * @throws {401} If unauthenticated
 * @throws {404} If token not found
 * @throws {409} If invite is not PENDING, clique has 50 members, or user is in 10 cliques
 * @throws {500} If database operation fails
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { token } = await params

    const invite = await prisma.cliqueInvite.findUnique({
      where: { token },
      select: { id: true, cliqueId: true, status: true, expiresAt: true },
    })

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { error: `Invite is ${invite.status.toLowerCase()} and can no longer be accepted` },
        { status: 409 }
      )
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invite has expired" },
        { status: 409 }
      )
    }

    const cliqueId = invite.cliqueId

    await prisma.$transaction(async (tx) => {
      // Acquire advisory locks for both the user and the clique.
      // The user lock (acquired first, consistent with POST /api/cliques)
      // serializes the per-user 10-clique check; the clique lock serializes
      // the 50-member check. Consistent ordering prevents deadlocks.
      const userLockKey = hashStringToInt(userId)
      await tx.$queryRaw`
        SELECT 1
        FROM (SELECT pg_advisory_xact_lock(${userLockKey})) AS user_lock_acquired
      `

      const cliqueLockKey = hashStringToInt(cliqueId)
      await tx.$queryRaw`
        SELECT 1
        FROM (SELECT pg_advisory_xact_lock(${cliqueLockKey})) AS clique_lock_acquired
      `

      // Check already-member inside the transaction (after locks) to be race-safe
      const alreadyMember = await tx.cliqueMember.findUnique({
        where: { cliqueId_userId: { cliqueId, userId } },
        select: { cliqueId: true },
      })
      if (alreadyMember) {
        throw new LimitExceededError("You are already a member of this clique")
      }

      // Check 50-member limit
      const memberCount = await tx.cliqueMember.count({ where: { cliqueId } })
      if (memberCount >= 50) {
        throw new LimitExceededError("This clique has reached the maximum of 50 members")
      }

      // Check 10-clique limit for the accepting user
      const userCliqueCount = await tx.cliqueMember.count({ where: { userId } })
      if (userCliqueCount >= 10) {
        throw new LimitExceededError("You can belong to a maximum of 10 cliques")
      }

      // Atomically mark invite as ACCEPTED — only succeeds if still PENDING.
      // This is the authoritative single-use enforcement under concurrent requests.
      const updated = await tx.cliqueInvite.updateMany({
        where: { id: invite.id, status: "PENDING" },
        data: { status: "ACCEPTED" },
      })

      if (updated.count === 0) {
        throw new LimitExceededError("Invite has already been accepted or revoked")
      }

      await tx.cliqueMember.create({ data: { cliqueId, userId } })
    })

    return NextResponse.json({ message: "Invite accepted", cliqueId })
  } catch (error) {
    if (error instanceof LimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Error accepting invite:", error)
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    )
  }
}
