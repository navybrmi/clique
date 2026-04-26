import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getCliqueFeed } from "@/lib/clique-service"
import type { CliqueFeedItem } from "@/types/clique"
import type { CliqueFeedPage } from "@/lib/clique-service"

const DEFAULT_PAGE_SIZE = 20

/**
 * GET /api/cliques/[id]/recommendations
 *
 * Returns the paginated recommendation feed for the clique. Only accessible by members.
 *
 * Query params:
 * - `page`  — 1-based page number (default: 1)
 * - `limit` — items per page (default: 20, max: 100)
 *
 * Each item exposes the submitter's name only when they are a current member
 * of the clique; otherwise `submitterName` is null.
 *
 * @returns {Promise<NextResponse>} `{ items, total }` ordered newest-first
 * @throws {401} If unauthenticated
 * @throws {403} If requester is not a clique member
 * @throws {404} If clique not found
 * @throws {500} If database query fails
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CliqueFeedPage | { error: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const { id } = await params

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

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE))
    const skip = (page - 1) * limit

    const feed = await getCliqueFeed(id, userId, { skip, take: limit })
    return NextResponse.json(feed)
  } catch (error) {
    console.error("Error fetching clique feed:", error)
    return NextResponse.json(
      { error: "Failed to fetch clique feed" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cliques/[id]/recommendations
 *
 * Bookmarks an existing recommendation into the clique. Only members can bookmark.
 *
 * Request Body:
 * @param {string} recommendationId - ID of the recommendation to add
 *
 * @returns {Promise<NextResponse>} Success message
 * @throws {401} If unauthenticated
 * @throws {400} If recommendationId is missing
 * @throws {403} If requester is not a clique member
 * @throws {404} If clique or recommendation not found
 * @throws {409} If recommendation is already in this clique
 * @throws {500} If database operation fails
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

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const { recommendationId } = body

    if (!recommendationId || typeof recommendationId !== "string") {
      return NextResponse.json(
        { error: "recommendationId is required" },
        { status: 400 }
      )
    }

    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
      select: { id: true },
    })
    if (!recommendation) {
      return NextResponse.json(
        { error: "Recommendation not found" },
        { status: 404 }
      )
    }

    const existing = await prisma.cliqueRecommendation.findUnique({
      where: { cliqueId_recommendationId: { cliqueId: id, recommendationId } },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Recommendation already in this clique" },
        { status: 409 }
      )
    }

    await prisma.cliqueRecommendation.create({
      data: { cliqueId: id, recommendationId, addedById: userId },
    })

    return NextResponse.json(
      { message: "Recommendation added to clique" },
      { status: 201 }
    )
  } catch (error) {
    // Unique-constraint violation: concurrent request already added this recommendation
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Recommendation already in this clique" },
        { status: 409 }
      )
    }
    console.error("Error adding recommendation to clique:", error)
    return NextResponse.json(
      { error: "Failed to add recommendation to clique" },
      { status: 500 }
    )
  }
}
