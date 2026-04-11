"use client"

/**
 * Client component that renders the recommendation submitter's name and the
 * submission date formatted in the viewer's browser timezone.
 *
 * Rendered on the server with whatever timezone the runtime uses, then
 * re-rendered on the client using the browser's local timezone.
 * `suppressHydrationWarning` on the date span prevents React from warning
 * about the server/client mismatch that naturally occurs when timezone differs.
 */
export function SubmitterInfo({
  name,
  createdAt,
}: {
  name: string | null
  createdAt: string
}) {
  const formatted = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      Recommended by {name || "Anonymous"}
      {" · "}
      <span suppressHydrationWarning>{formatted}</span>
    </p>
  )
}
