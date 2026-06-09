import Link from "next/link"
import { Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AddToCliquesDialog } from "@/components/add-to-cliques-dialog"

/** A clique the current user belongs to that contains the recommendation. */
export interface UserClique {
  id: string
  name: string
}

interface InYourCliquesCardProps {
  /** Recommendation being viewed — used for the add-to-clique action. */
  recommendationId: string
  /** Name of the recommendation entity — used in the add-to-clique dialog label. */
  recommendationName: string
  /**
   * Cliques the current user belongs to that contain this recommendation.
   * When empty, the card shows an empty-state prompt.
   */
  cliques: UserClique[]
  /** Current user id. When provided, shows the "Add to clique" action in the empty state. */
  currentUserId?: string | null
}

/**
 * Sidebar card listing the user's cliques that contain the recommendation.
 * Each entry links to that clique's feed. When empty, prompts the user to add
 * the reco to one of their cliques so they can like and comment.
 */
export function InYourCliquesCard({
  recommendationId,
  recommendationName,
  cliques,
  currentUserId,
}: InYourCliquesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">In Your Cliques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {cliques.length === 0 ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Add this recommendation to one of your cliques to like and comment.
            </p>
            {currentUserId && (
              <AddToCliquesDialog
                recommendationId={recommendationId}
                recommendationName={recommendationName}
              />
            )}
          </div>
        ) : (
          <ul className="space-y-1.5" aria-label="Cliques containing this recommendation">
            {cliques.map((clique) => (
              <li key={clique.id}>
                <Link
                  href={`/?cliqueId=${clique.id}`}
                  aria-label={`Open the ${clique.name} clique feed`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                >
                  <Users className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">{clique.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
