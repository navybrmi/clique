import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { TypedNotification } from "@/types/clique"
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

    // Cast payload to typed union
    const typed = notifications.map((n) => ({
      ...n,
      payload: n.payload as NotificationPayload,
    })) as TypedNotification[]

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
    const { ids } = body as { ids?: string[] }

    const where = ids?.length
      ? { userId, id: { in: ids } }
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
