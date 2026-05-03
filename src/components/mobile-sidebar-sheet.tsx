"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { CliqueSidebar } from "@/components/clique-sidebar"
import type { CliqueSidebarItem } from "@/types/clique"

interface MobileSidebarSheetProps {
  cliques: CliqueSidebarItem[]
  activeCliqueId?: string
  activeMine?: boolean
  userId?: string | null
  currentCliqueId?: string
}

/**
 * Mobile hamburger trigger that opens a left-slide Sheet drawer containing
 * the full CliqueSidebar navigation. Intended for use on small screens only.
 *
 * @param props - Same props as CliqueSidebar
 * @returns Hamburger button with Sheet drawer
 */
export function MobileSidebarSheet({
  cliques,
  activeCliqueId,
  activeMine,
  userId,
  currentCliqueId,
}: MobileSidebarSheetProps) {
  const [open, setOpen] = useState(false)

  const activeFeedName = activeCliqueId
    ? (cliques.find((c) => c.id === activeCliqueId)?.name ?? "Feeds")
    : activeMine
      ? "My Recommendations"
      : "Public"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label={`Open navigation menu — current feed: ${activeFeedName}`}
          className="flex items-center justify-center p-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent>
        <div className="overflow-y-auto h-full pt-2">
          <CliqueSidebar
            cliques={cliques}
            activeCliqueId={activeCliqueId}
            activeMine={activeMine}
            userId={userId}
            currentCliqueId={currentCliqueId}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
