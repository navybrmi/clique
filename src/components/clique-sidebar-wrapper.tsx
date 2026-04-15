import { getPrismaClient } from "@/lib/prisma"
import { CliqueSidebar } from "@/components/clique-sidebar"

interface CliqueSidebarWrapperProps {
  /** Authenticated user ID. If absent, the sidebar is not rendered. */
  userId?: string | null
  /** Active clique ID from the current URL, if any. */
  activeCliqueId?: string
}

/**
 * Server wrapper that fetches the authenticated user's cliques for sidebar navigation.
 *
 * @param props - Component props
 * @returns Sidebar wrapper with clique data, or null when unauthenticated
 */
export async function CliqueSidebarWrapper({
  userId,
  activeCliqueId,
}: CliqueSidebarWrapperProps) {
  if (!userId) {
    return null
  }

  const prisma = getPrismaClient()
  const cliqueDelegate = (
    prisma as unknown as {
      clique?: {
        findMany?: (args: {
          where: { members: { some: { userId: string } } }
          select: { id: true; name: true }
          orderBy: { createdAt: "desc" }
        }) => Promise<{ id: string; name: string }[]>
      }
    }
  ).clique

  const cliques =
    typeof cliqueDelegate?.findMany === "function"
      ? await cliqueDelegate.findMany({
          where: {
            members: {
              some: { userId },
            },
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.$queryRaw<{ id: string; name: string }[]>`
          SELECT c.id, c.name
          FROM "Clique" c
          INNER JOIN "CliqueMember" cm ON cm."cliqueId" = c.id
          WHERE cm."userId" = ${userId}
          ORDER BY c."createdAt" DESC
        `

  return (
    <aside>
      <CliqueSidebar cliques={cliques} activeCliqueId={activeCliqueId} />
    </aside>
  )
}
