import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { generateInviteToken, getInviteExpiry, sendInviteEmail } from "@/lib/invite-service"

/**
 * GET /api/cliques/[id]/invites
 *
 * Lists all PENDING invites for the clique. Only accessible by the clique creator.
 *
 * @returns {Promise<NextResponse>} Array of active invites with creator info
 * @throws {401} If unauthenticated
 * @throws {403} If requester is not the clique creator
 * @throws {404} If clique not found
 * @throws {500} If database query fails
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    const invites = await prisma.cliqueInvite.findMany({
      where: { cliqueId: id, status: "PENDING" },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error("Error fetching invites:", error)
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cliques/[id]/invites
 *
 * Creates a new invite. Two types:
 * - `{ type: "link" }` — generates a shareable link invite (no email)
 * - `{ type: "user", emailOrUsername }` — looks up a user by email or username
 *   and sends an in-app notification + email. When the value contains "@" it is
 *   treated as an email address; otherwise it is treated as a username. Inviting
 *   by username requires the user to already have an account.
 *
 * Only clique members can create invites.
 *
 * @returns {Promise<NextResponse>} Created invite
 * @throws {401} If unauthenticated
 * @throws {403} If requester is not a clique member
 * @throws {400} If type is "user" and emailOrUsername is missing
 * @throws {404} If clique not found, or type is "user" and no matching user found
 * @throws {500} If database or email operation fails
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id } = await params

    // Verify membership
    const membership = await prisma.cliqueMember.findUnique({
      where: { cliqueId_userId: { cliqueId: id, userId } },
    })

    if (!membership) {
      const exists = await prisma.clique.findUnique({
        where: { id },
        select: { id: true },
      })
      if (!exists) {
        return NextResponse.json({ error: "Clique not found" }, { status: 404 })
      }
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { type, emailOrUsername } = body

    if (type === "user") {
      if (!emailOrUsername || typeof emailOrUsername !== "string") {
        return NextResponse.json(
          { error: "emailOrUsername is required for user invites" },
          { status: 400 }
        )
      }

      const isEmail = emailOrUsername.includes("@")

      // Resolve the invitee. Email invites may target users without an account
      // yet (invite stored, email sent, they sign up later). Username invites
      // require an existing account — we need their email to contact them.
      let invitee: { id: string; name: string | null; email: string | null } | null = null
      let resolvedEmail: string

      if (isEmail) {
        resolvedEmail = emailOrUsername
        invitee = await prisma.user.findUnique({
          where: { email: emailOrUsername },
          select: { id: true, name: true, email: true },
        })
      } else {
        invitee = await prisma.user.findFirst({
          where: { name: emailOrUsername },
          select: { id: true, name: true, email: true },
        })
        if (!invitee?.email) {
          return NextResponse.json(
            { error: "No user found with that username" },
            { status: 404 }
          )
        }
        resolvedEmail = invitee.email
      }

      const [clique, inviter] = await Promise.all([
        prisma.clique.findUnique({ where: { id }, select: { name: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      ])

      const token = generateInviteToken()
      const expiresAt = getInviteExpiry()

      // If invitee has an account, create invite + in-app notification atomically.
      // If not (email invite only), create just the invite — they sign up later.
      const invite = invitee
        ? await prisma.$transaction(async (tx) => {
            const inv = await tx.cliqueInvite.create({
              data: {
                token,
                cliqueId: id,
                createdById: userId,
                email: resolvedEmail,
                status: "PENDING",
                expiresAt,
              },
              include: { createdBy: { select: { id: true, name: true } } },
            })

            await tx.notification.create({
              data: {
                userId: invitee!.id,
                type: "CLIQUE_INVITE",
                payload: {
                  type: "CLIQUE_INVITE",
                  cliqueId: id,
                  cliqueName: clique?.name ?? "",
                  invitedById: userId,
                  invitedByName: inviter?.name ?? null,
                  inviteToken: token,
                },
              },
            })

            return inv
          })
        : await prisma.cliqueInvite.create({
            data: {
              token,
              cliqueId: id,
              createdById: userId,
              email: resolvedEmail,
              status: "PENDING",
              expiresAt,
            },
            include: { createdBy: { select: { id: true, name: true } } },
          })

      // Send email best-effort — failure must not roll back the invite
      try {
        await sendInviteEmail({
          toEmail: resolvedEmail,
          inviterName: inviter?.name ?? null,
          cliqueName: clique?.name ?? "",
          inviteToken: token,
        })
      } catch (emailError) {
        console.error("Failed to send invite email:", emailError)
      }

      return NextResponse.json(invite, { status: 201 })
    }

    // Default: link invite
    const token = generateInviteToken()
    const expiresAt = getInviteExpiry()

    const invite = await prisma.cliqueInvite.create({
      data: {
        token,
        cliqueId: id,
        createdById: userId,
        status: "PENDING",
        expiresAt,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(invite, { status: 201 })
  } catch (error) {
    console.error("Error creating invite:", error)
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    )
  }
}
