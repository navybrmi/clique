import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { CliqueInviteLookup } from "@/types/clique"

/**
 * GET /api/invites/[token]
 *
 * Public endpoint to look up an invite by token.
 * Returns minimal info: clique name, status, and expiry.
 *
 * @returns {Promise<NextResponse>} Invite lookup result
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
      id: invite.id,
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
 * Enforces the 50-member limit using a PostgreSQL advisory lock to prevent
 * race conditions. Also enforces the 10-clique limit on the accepting user.
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
      // Advisory lock keyed by cliqueId hash to serialize concurrent accepts
      const lockKey = hashStringToInt(cliqueId)
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${lockKey})`

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

      // Add member and mark invite accepted
      await tx.cliqueMember.create({ data: { cliqueId, userId } })
      await tx.cliqueInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED" },
      })
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

class LimitExceededError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LimitExceededError"
  }
}

function hashStringToInt(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash
}
