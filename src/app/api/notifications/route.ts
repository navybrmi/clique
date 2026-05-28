import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { TypedNotification, CliqueJoinRequestPayload } from "@/types/clique"
import type { NotificationPayload } from "@/types/clique"

/**
 * GET /api/notifications
 *
 * Returns the 50 most recent notifications for the current user.
 *
 * @returns {Promise<NextResponse>} Array of typed notifications
 * @throws {401} If unauthenticated
 * @throws {500} If database query fails
 */
export async function GET(): Promise<NextResponse<TypedNotification[] | { error: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    // Cast payload through unknown to satisfy TypeScript's type narrowing
    const typed = notifications.map((n) => ({
      ...n,
      payload: n.payload as unknown as NotificationPayload,
    })) as TypedNotification[]

    // Auto-clean CLIQUE_JOIN_REQUEST notifications whose underlying request is
    // no longer PENDING (approved/rejected via another path, e.g. the management
    // dialog). This self-heals stale notifications that pre-date the server-side
    // cleanup added to the approve/reject routes.
    const joinRequestNotifications = typed.filter(
      (n): n is TypedNotification & { payload: CliqueJoinRequestPayload } =>
        n.payload.type === "CLIQUE_JOIN_REQUEST"
    )

    if (joinRequestNotifications.length > 0) {
      const requestIds = joinRequestNotifications.map((n) => n.payload.requestId)

      const pendingRequests = await prisma.cliqueMembershipRequest.findMany({
        where: { id: { in: requestIds }, status: "PENDING" },
        select: { id: true },
      })

      const pendingSet = new Set(pendingRequests.map((r) => r.id))
      const staleIds = joinRequestNotifications
        .filter((n) => !pendingSet.has(n.payload.requestId))
        .map((n) => n.id)

      if (staleIds.length > 0) {
        const staleIdSet = new Set(staleIds)
        await prisma.notification.deleteMany({ where: { id: { in: staleIds } } })
        return NextResponse.json(typed.filter((n) => !staleIdSet.has(n.id)))
      }
    }

    return NextResponse.json(typed)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications
 *
 * Marks notifications as read.
 * - If `ids` is provided, marks only those notifications as read.
 * - If `ids` is omitted, marks all of the user's notifications as read.
 *
 * Request Body:
 * @param {string[]} [ids] - Optional array of notification IDs to mark read
 *
 * @returns {Promise<NextResponse>} Count of updated notifications
 * @throws {401} If unauthenticated
 * @throws {500} If database operation fails
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json().catch(() => ({}))
    const { ids } = body as { ids?: unknown }

    if (
      ids !== undefined &&
      (!Array.isArray(ids) || !(ids as unknown[]).every((id) => typeof id === "string"))
    ) {
      return NextResponse.json(
        { error: "ids must be an array of strings" },
        { status: 400 }
      )
    }

    const validIds = ids as string[] | undefined
    const where = validIds?.length
      ? { userId, id: { in: validIds } }
      : { userId }

    const result = await prisma.notification.updateMany({
      where,
      data: { read: true },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error("Error updating notifications:", error)
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    )
  }
}
