import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * POST /api/recommendations/[id]/upvotes?cliqueId=<id>
 *
 * Clique-gated upvote: the caller must be a member of the given clique and the
 * recommendation must belong to that clique. The upvote itself is persisted as a
 * global (userId, recommendationId) record — one vote per user per recommendation
 * across all cliques — consistent with the UpVote schema constraint.
 *
 * @returns { upvotes: number } — total upvote count for the recommendation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recommendationId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const cliqueId = request.nextUrl.searchParams.get("cliqueId")

    if (!cliqueId) {
      return NextResponse.json({ error: "cliqueId is required" }, { status: 400 })
    }

    const [membership, cliqueRec] = await Promise.all([
      prisma.cliqueMember.findUnique({
        where: { cliqueId_userId: { cliqueId, userId } },
        select: { userId: true },
      }),
      prisma.cliqueRecommendation.findUnique({
        where: { cliqueId_recommendationId: { cliqueId, recommendationId } },
        select: { recommendationId: true },
      }),
    ])

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!cliqueRec) {
      return NextResponse.json(
        { error: "Recommendation not found in clique" },
        { status: 404 }
      )
    }

    await prisma.upVote.upsert({
      where: { userId_recommendationId: { userId, recommendationId } },
      create: { userId, recommendationId },
      update: {},
    })

    const upvotes = await prisma.upVote.count({ where: { recommendationId } })
    return NextResponse.json({ upvotes })
  } catch (error) {
    console.error("Error creating upvote:", error)
    return NextResponse.json({ error: "Failed to upvote" }, { status: 500 })
  }
}

/**
 * DELETE /api/recommendations/[id]/upvotes
 *
 * Removes the authenticated user's upvote. Because the UpVote model enforces
 * @@unique([userId, recommendationId]), each user has at most one upvote record
 * per recommendation, so no clique scoping is required here.
 *
 * @returns { upvotes: number } — total upvote count for the recommendation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recommendationId } = await params
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    await prisma.upVote.deleteMany({ where: { userId, recommendationId } })

    const upvotes = await prisma.upVote.count({ where: { recommendationId } })
    return NextResponse.json({ upvotes })
  } catch (error) {
    console.error("Error removing upvote:", error)
    return NextResponse.json({ error: "Failed to remove upvote" }, { status: 500 })
  }
}
