"use client"

import { useState } from "react"
import { UsersRound } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { CliqueSidebar } from "@/components/clique-sidebar"
import { AddRecommendationTrigger } from "@/components/add-recommendation-trigger"
import type { CliqueSidebarItem } from "@/types/clique"

interface MobileBottomBarProps {
  /** Authenticated user ID, or null when logged out. */
  userId: string | null
  /** Cliques the current user belongs to. */
  cliques: CliqueSidebarItem[]
  /** Active clique ID from the current page URL, if any. */
  activeCliqueId?: string
  /** Whether the "My Recommendations" feed is currently active. */
  activeMine?: boolean
  /** Current clique context forwarded into the Add Recommendation dialog. */
  currentCliqueId?: string
}

/**
 * Fixed bottom action bar for mobile viewports (hidden at `lg` and above,
 * where the left sidebar is visible).
 *
 * Surfaces the two primary actions without opening the hamburger drawer:
 * a Cliques button (authenticated only) that opens a bottom sheet with the
 * full feed switcher, and an Add button wired to the Add Recommendation
 * dialog (which shows the sign-in prompt for logged-out users).
 *
 * @param props - Component props
 * @returns The mobile bottom action bar
 */
export function MobileBottomBar({
  userId,
  cliques,
  activeCliqueId,
  activeMine,
  currentCliqueId,
}: MobileBottomBarProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-16 items-stretch">
        {userId != null && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Switch feed"
                className="flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <UsersRound className="h-5 w-5" aria-hidden="true" />
                Cliques
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto p-4 pb-6">
              <CliqueSidebar
                cliques={cliques}
                activeCliqueId={activeCliqueId}
                activeMine={activeMine}
                userId={userId}
                currentCliqueId={currentCliqueId}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}
        <AddRecommendationTrigger
          userId={userId}
          currentCliqueId={currentCliqueId}
          layout="mobile-bar"
        />
      </div>
    </div>
  )
}
