import { getPrismaClient } from "@/lib/prisma"
import { CliqueSidebar } from "@/components/clique-sidebar"
import { MobileSidebarSheet } from "@/components/mobile-sidebar-sheet"

interface CliqueSidebarWrapperProps {
  /** Authenticated user ID. If absent, the sidebar is not rendered. */
  userId?: string | null
  /** Active clique ID from the current URL, if any. */
  activeCliqueId?: string
  /** Whether the "My Recommendations" feed is currently active. */
  activeMine?: boolean
  /** Current clique context forwarded into the Add Recommendation dialog. */
  currentCliqueId?: string
  /** When true, renders only the mobile sheet (for use inside the header). */
  mobileOnly?: boolean
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
  activeMine,
  currentCliqueId,
  mobileOnly = false,
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

  if (mobileOnly) {
    return (
      <MobileSidebarSheet
        cliques={cliques}
        activeCliqueId={activeCliqueId}
        activeMine={activeMine}
        userId={userId}
        currentCliqueId={currentCliqueId}
      />
    )
  }

  return (
    <aside className="hidden lg:block">
      <CliqueSidebar
        cliques={cliques}
        activeCliqueId={activeCliqueId}
        activeMine={activeMine}
        userId={userId}
        currentCliqueId={currentCliqueId}
      />
    </aside>
  )
}
