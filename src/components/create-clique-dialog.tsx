"use client"

import { type FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CliqueSidebarItem } from "@/types/clique"

interface CreateCliqueDialogProps {
  /** Optional callback fired after a clique is created successfully. */
  onSuccess?: (clique: CliqueSidebarItem) => void
}

/**
 * Dialog for creating a new clique from the feed sidebar.
 *
 * @param props - Component props
 * @returns Dialog trigger and modal for clique creation
 */
export function CreateCliqueDialog({ onSuccess }: CreateCliqueDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trimmedName = name.trim()

  const resetForm = () => {
    setName("")
    setError(null)
    setIsSubmitting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!trimmedName) {
      setError("Clique name is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/cliques", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      })

      const body = await response.json().catch(() => null)

      if (!response.ok) {
        setError(body?.error ?? "Failed to create clique")
        setIsSubmitting(false)
        return
      }

      const clique = body as CliqueSidebarItem
      onSuccess?.({ id: clique.id, name: clique.name })
      handleOpenChange(false)
      router.refresh()
    } catch (submitError) {
      console.error("Error creating clique:", submitError)
      setError("Failed to create clique")
      setIsSubmitting(false)
    }
  }

  return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full justify-start">
          <Plus className="h-4 w-4" />
          Create new Clique
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a clique</DialogTitle>
          <DialogDescription>
            Start a new private feed for recommendations you want to share with a
            specific group.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clique-name">Clique name</Label>
            <Input
              id="clique-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Weekend Favorites"
              maxLength={80}
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmedName || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create new Clique"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
