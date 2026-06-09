import Link from "next/link"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

/** A clique the current user shares with a recommendation. */
export interface CliqueChip {
  id: string
  name: string
}

interface CliqueChipsProps {
  /** Cliques to show as chips (already sliced/ordered by the caller). */
  chips: CliqueChip[]
  className?: string
}

/**
 * Renders clique "chips" on a public feed card — the cliques that contain the
 * recommendation and that the current user is also a member of. Each chip links
 * to that clique's feed. Renders nothing when there are no chips.
 */
export function CliqueChips({ chips, className }: CliqueChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {chips.map((chip) => (
        <Link
          key={chip.id}
          href={`/?cliqueId=${chip.id}`}
          aria-label={`View the ${chip.name} clique`}
          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-950/70"
        >
          <Users className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          <span className="max-w-[10rem] truncate">{chip.name}</span>
        </Link>
      ))}
    </div>
  )
}
