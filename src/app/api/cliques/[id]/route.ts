import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

/**
 * GET /api/cliques/[id]
 *
 * Returns clique details including full member list.
 * Only accessible to clique members.
 *
 * @returns {Promise<NextResponse>} Clique with members and creator info
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not a clique member
 * @throws {404} If clique does not exist
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
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, image: true, email: true },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
    })

    if (!clique) {
      return NextResponse.json({ error: "Clique not found" }, { status: 404 })
    }

    // Check membership
    const isMember = clique.members.some(
      (m) => m.userId === userId
    )
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(clique)
  } catch (error) {
    console.error("Error fetching clique:", error)
    return NextResponse.json(
      { error: "Failed to fetch clique" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cliques/[id]
 *
 * Deletes a clique. Only the creator can delete.
 * CliqueRecommendation associations are cascade-deleted;
 * the underlying Recommendation rows remain.
 *
 * @returns {Promise<NextResponse>} Success message
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not the creator
 * @throws {404} If clique does not exist
 * @throws {500} If database operation fails
 */
export async function DELETE(
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

    await prisma.clique.delete({ where: { id } })

    return NextResponse.json({ message: "Clique deleted" })
  } catch (error) {
    console.error("Error deleting clique:", error)
    return NextResponse.json(
      { error: "Failed to delete clique" },
      { status: 500 }
    )
  }
}
