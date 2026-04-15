"use client"

import Link from "next/link"
import { Users } from "lucide-react"
import { CreateCliqueDialog } from "@/components/create-clique-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CliqueSidebarItem } from "@/types/clique"

interface CliqueSidebarProps {
  /** Cliques the current user belongs to. */
  cliques: CliqueSidebarItem[]
  /** Active clique ID from the current page URL, if any. */
  activeCliqueId?: string
}

/**
 * Sidebar navigation for switching between the public feed and clique feeds.
 *
 * @param props - Component props
 * @returns Left-nav content for clique-aware home feed navigation
 */
export function CliqueSidebar({
  cliques,
  activeCliqueId,
}: CliqueSidebarProps) {
  const getNavItemClassName = (isActive: boolean) =>
    cn(
      buttonVariants({
        variant: isActive ? "secondary" : "ghost",
      }),
      "w-full justify-start gap-2",
      isActive &&
        "border border-zinc-900/20 bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 dark:border-zinc-100/30 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
    )

  return (
    <div className="sticky top-24 space-y-4 rounded-xl border bg-white/70 p-4 backdrop-blur-sm dark:bg-zinc-950/70">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          <Users className="h-4 w-4" />
          Feeds
        </div>
        <CreateCliqueDialog />
      </div>

      <div className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Select Feed
        </p>

        <nav className="space-y-2" aria-label="Clique feeds">
          <Link
            href="/"
            aria-label="Public"
            aria-current={!activeCliqueId ? "page" : undefined}
            className={getNavItemClassName(!activeCliqueId)}
          >
            <span>Public</span>
          </Link>

          {cliques.map((clique) => (
            <Link
              key={clique.id}
              href={`/?cliqueId=${clique.id}`}
              aria-label={clique.name}
              aria-current={activeCliqueId === clique.id ? "page" : undefined}
              className={getNavItemClassName(activeCliqueId === clique.id)}
            >
              <span className="truncate">{clique.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {cliques.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Create your first clique to start a private recommendations feed.
        </p>
      )}
    </div>
  )
}
