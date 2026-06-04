import Link from "next/link"
import { Users } from "lucide-react"

/**
 * A clique the current user belongs to that contains the recommendation.
 */
export interface PromptClique {
  id: string
  name: string
}

interface CommentCliquePromptProps {
  /** The recommendation being viewed. */
  recommendationId: string
  /**
   * The current user's cliques that contain this recommendation. When empty,
   * the user has no clique through which they can comment yet.
   */
  userCliques: PromptClique[]
}

/**
 * Shown in place of the comment thread when the detail page has no valid clique
 * context (e.g. opened from the public feed). Comments are clique-scoped, so the
 * user must open the recommendation within one of their cliques to read or post.
 *
 * - When the reco is in one or more of the user's cliques, links to open it in
 *   each clique's context (`?cliqueId=`).
 * - When the reco is in none of the user's cliques, prompts them to add it to a
 *   clique first.
 */
export function CommentCliquePrompt({
  recommendationId,
  userCliques,
}: CommentCliquePromptProps) {
  if (userCliques.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Comments are shared within a clique. Add this recommendation to one of
          your cliques to start commenting.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-dashed p-4">
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        Comments are shared within a clique. Open this recommendation in one of
        your cliques to view and add comments:
      </p>
      <ul className="space-y-1">
        {userCliques.map((clique) => (
          <li key={clique.id}>
            <Link
              href={`/recommendations/${recommendationId}?cliqueId=${clique.id}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:underline dark:text-amber-500"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              {clique.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
