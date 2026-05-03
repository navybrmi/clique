import { UsersRound, Sparkles } from "lucide-react"
import Link from "next/link"
import { getPrismaClient } from "@/lib/prisma"
import { CliqueSidebar } from "@/components/clique-sidebar"
import { MobileSidebarSheet } from "@/components/mobile-sidebar-sheet"
import { CreateCliqueDialog } from "@/components/create-clique-dialog"

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
    <>
      <aside className="hidden lg:block">
        <CliqueSidebar
          cliques={cliques}
          activeCliqueId={activeCliqueId}
          activeMine={activeMine}
          userId={userId}
          currentCliqueId={currentCliqueId}
        />
      </aside>

      {cliques.length > 0 && !activeCliqueId && (
        <div className="lg:hidden rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Switch to a clique feed
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Your friends are sharing recommendations privately. Jump into one of your cliques.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {cliques.map((clique) => (
                  <Link
                    key={clique.id}
                    href={`/?cliqueId=${clique.id}`}
                    className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {clique.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {cliques.length === 0 && (
        <div className="lg:hidden rounded-xl border-2 border-dashed border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
          <div className="flex items-start gap-3">
            <UsersRound className="mt-0.5 h-6 w-6 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Create a clique for a better experience
              </p>
              <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Cliques are private groups where you and trusted friends share recommendations with each other.
              </p>
              <CreateCliqueDialog />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
