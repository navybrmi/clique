"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { CliqueWithMemberCount } from "@/types/clique"

interface AddToCliquesDialogProps {
  /** Recommendation to bookmark into one or more cliques. */
  recommendationId: string
  /** Human-readable recommendation name shown in the dialog copy. */
  recommendationName: string
  /** Optional callback fired after at least one clique add succeeds. */
  onSuccess?: () => void
  /** Render mode — "default" shows labelled button, "icon" shows icon-only with tooltip. */
  variant?: "default" | "icon"
}

type SelectableClique = Pick<CliqueWithMemberCount, "id" | "name" | "_count">

interface AddToCliqueResult {
  cliqueId: string
  ok: boolean
  status: number
  error: string | null
}

/**
 * Dialog for bookmarking a public recommendation into one or more cliques.
 *
 * @param props - Component props
 * @returns Trigger button and modal for selecting target cliques
 */
export function AddToCliquesDialog({
  recommendationId,
  recommendationName,
  onSuccess,
  variant = "default",
}: AddToCliquesDialogProps) {
  const [open, setOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [cliques, setCliques] = useState<SelectableClique[]>([])
  const [selectedCliqueIds, setSelectedCliqueIds] = useState<string[]>([])
  const [isLoadingCliques, setIsLoadingCliques] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allSelected = cliques.length > 0 && selectedCliqueIds.length === cliques.length

  const resetDialog = () => {
    setCliques([])
    setSelectedCliqueIds([])
    setIsLoadingCliques(false)
    setIsSubmitting(false)
    setError(null)
  }

  const loadCliques = async () => {
    setIsLoadingCliques(true)
    setError(null)

    try {
      const response = await fetch("/api/cliques")
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        setError(body?.error ?? "Failed to load your cliques")
        setCliques([])
        return
      }

      setCliques(Array.isArray(body) ? (body as SelectableClique[]) : [])
    } catch (loadError) {
      console.error("Error loading cliques:", loadError)
      setError("Failed to load your cliques")
      setCliques([])
    } finally {
      setIsLoadingCliques(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setTooltipOpen(false)
      void loadCliques()
      return
    }

    resetDialog()
  }

  const handleCliqueToggle = (cliqueId: string) => {
    setSelectedCliqueIds((currentSelectedCliqueIds) =>
      currentSelectedCliqueIds.includes(cliqueId)
        ? currentSelectedCliqueIds.filter((selectedCliqueId) => selectedCliqueId !== cliqueId)
        : [...currentSelectedCliqueIds, cliqueId]
    )
  }

  const handleSelectAllToggle = () => {
    setSelectedCliqueIds(allSelected ? [] : cliques.map((clique) => clique.id))
  }

  const buildSuccessMessage = (results: AddToCliqueResult[]): string => {
    const addedCount = results.filter((result) => result.ok).length
    const alreadySavedCount = results.filter((result) => result.status === 409).length

    const parts: string[] = []
    if (addedCount > 0) {
      parts.push(
        addedCount === 1 ? "Added to 1 clique." : `Added to ${addedCount} cliques.`
      )
    }
    if (alreadySavedCount > 0) {
      parts.push(
        alreadySavedCount === 1
          ? "Already saved in 1 clique."
          : `Already saved in ${alreadySavedCount} cliques.`
      )
    }

    return parts.join(" ")
  }

  const handleSubmit = async () => {
    if (selectedCliqueIds.length === 0) {
      setError("Select at least one clique")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const results = await Promise.all(
        selectedCliqueIds.map(async (cliqueId): Promise<AddToCliqueResult> => {
          try {
            const response = await fetch(`/api/cliques/${cliqueId}/recommendations`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ recommendationId }),
            })
            const body = await response.json().catch(() => null)

            return {
              cliqueId,
              ok: response.ok,
              status: response.status,
              error: body?.error ?? null,
            }
          } catch (submitError) {
            console.error("Error adding recommendation to clique:", submitError)
            return {
              cliqueId,
              ok: false,
              status: 500,
              error: "Failed to add recommendation to clique",
            }
          }
        })
      )

      const failures = results.filter((result) => !result.ok && result.status !== 409)
      if (failures.length > 0) {
        setError(failures[0].error ?? "Failed to add recommendation to one or more cliques")
        return
      }

      const successMessage = buildSuccessMessage(results)
      if (successMessage) {
        window.alert(successMessage)
      }

      onSuccess?.()
      handleOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const trigger =
    variant === "icon" ? (
      <TooltipProvider>
        <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
          <TooltipTrigger asChild>
            {/* span owns the tooltip hover; DialogTrigger owns the click — avoids double-asChild conflict */}
            <span className="inline-flex">
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-zinc-900/85 shadow-md hover:bg-zinc-700 dark:bg-zinc-100/90 dark:hover:bg-zinc-200"
                  aria-label="Add to your clique(s)"
                >
                  <Plus className="h-4 w-4 text-white dark:text-zinc-900" strokeWidth={2.5} />
                </Button>
              </DialogTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">Add to your clique(s)</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          Add to Clique
        </Button>
      </DialogTrigger>
    )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Clique</DialogTitle>
          <DialogDescription>
            Choose which cliques should include <span className="font-medium">{recommendationName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          {isLoadingCliques ? (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your cliques...
            </div>
          ) : cliques.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You aren&apos;t part of any cliques yet. Create one from the sidebar first.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {selectedCliqueIds.length} selected
                </p>
                {cliques.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAllToggle}
                    disabled={isSubmitting}
                  >
                    {allSelected ? "Clear all" : "Select all"}
                  </Button>
                )}
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
                {cliques.map((clique) => {
                  const inputId = `add-to-clique-${recommendationId}-${clique.id}`
                  return (
                    <label
                      key={clique.id}
                      htmlFor={inputId}
                      className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={selectedCliqueIds.includes(clique.id)}
                        onChange={() => handleCliqueToggle(clique.id)}
                        disabled={isSubmitting}
                        className="mt-1 h-4 w-4 rounded border-zinc-300"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {clique.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {clique._count.members} members
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoadingCliques || cliques.length === 0 || selectedCliqueIds.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add to selected cliques"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
