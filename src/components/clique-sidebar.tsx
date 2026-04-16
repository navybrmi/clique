"use client"

import Link from "next/link"
import { Sparkles, Users } from "lucide-react"
import { AddRecommendationTrigger } from "@/components/add-recommendation-trigger"
import { CreateCliqueDialog } from "@/components/create-clique-dialog"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CliqueSidebarItem } from "@/types/clique"

interface CliqueSidebarProps {
  /** Cliques the current user belongs to. */
  cliques: CliqueSidebarItem[]
  /** Active clique ID from the current page URL, if any. */
  activeCliqueId?: string
  /** Authenticated user ID, used to render the add recommendation CTA. */
  userId?: string | null
  /** Current clique context forwarded into the Add Recommendation dialog. */
  currentCliqueId?: string
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
  userId,
  currentCliqueId,
}: CliqueSidebarProps) {
  const getNavItemClassName = (isActive: boolean) =>
    cn(
      buttonVariants({
        variant: isActive ? "secondary" : "ghost",
      }),
      "w-full justify-start gap-2 border border-zinc-200/80 bg-white/80 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900",
      isActive &&
        "border-zinc-300 bg-zinc-100 text-zinc-950 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-900"
    )

  const renderFeedLabel = (label: string, isActive: boolean) => (
    <span className="flex w-full items-center justify-between gap-3">
      <span className="truncate font-serif italic">{label}</span>
      {isActive && (
        <span
          aria-hidden="true"
          data-testid="active-feed-indicator"
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-500 dark:bg-zinc-400"
        />
      )}
    </span>
  )

  return (
    <div className="sticky top-24 space-y-4 rounded-xl border bg-white/70 p-4 backdrop-blur-sm dark:bg-zinc-950/70">
      {userId !== undefined && (
        <div className="space-y-3 rounded-lg bg-zinc-50/80 p-3 dark:bg-zinc-900/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-500">
              <Sparkles className="h-4 w-4" />
              Quick start
            </div>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Share a recommendation or jump into the feeds your cliques are
              building together.
            </p>
          </div>
          <div className="-ml-2">
            <AddRecommendationTrigger
              userId={userId}
              currentCliqueId={currentCliqueId}
              layout="sidebar"
            />
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <div className="flex items-center gap-2 px-3 text-sm font-bold uppercase tracking-wide text-zinc-500">
          <Users className="h-4 w-4" />
          Feeds
        </div>
        <div className="flex">
          <CreateCliqueDialog />
        </div>

        <div className="space-y-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
          <p className="px-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Choose a feed
          </p>

          <nav className="space-y-2" aria-label="Clique feeds">
            <Link
              href="/"
              aria-label="Public"
              aria-current={!activeCliqueId ? "page" : undefined}
              className={getNavItemClassName(!activeCliqueId)}
            >
              {renderFeedLabel("Public", !activeCliqueId)}
            </Link>

            {cliques.map((clique) => (
              <Link
                key={clique.id}
                href={`/?cliqueId=${clique.id}`}
                aria-label={clique.name}
                aria-current={activeCliqueId === clique.id ? "page" : undefined}
                className={getNavItemClassName(activeCliqueId === clique.id)}
              >
                {renderFeedLabel(clique.name, activeCliqueId === clique.id)}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {cliques.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Create your first clique to start a private recommendations feed.
        </p>
      )}
    </div>
  )
}
