import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/categories
 * 
 * Retrieves all active categories sorted alphabetically.
 * 
 * @returns {Promise<NextResponse>} JSON array of active categories
 * @throws {500} If database query fails
 * 
 * @example
 * // Response format:
 * // [
 * //   { id: "1", name: "RESTAURANT", displayName: "Restaurants", isActive: true, ... },
 * //   { id: "2", name: "MOVIE", displayName: "Movies", isActive: true, ... }
 * // ]
 */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }
}
