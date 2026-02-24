"use client"

import { useState } from "react"
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
import { Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

/**
 * Props for the DeleteRecommendationButton component
 */
interface DeleteRecommendationButtonProps {
  /** The recommendation object to delete. Must include id and entity.name */
  recommendation: any
  /** Whether the current user is the owner of this recommendation */
  isOwner: boolean
}

/**
 * Button component for deleting recommendations with confirmation dialog.
 *
 * Shows a disabled button for non-owners and an interactive delete dialog for the owner.
 *
 * @param props - Component props
 * @returns A delete button (disabled for non-owners, interactive for owner)
 */
export function DeleteRecommendationButton({ recommendation, isOwner }: DeleteRecommendationButtonProps) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/recommendations/${recommendation.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setOpen(false)
        // Redirect to home page after successful deletion
        router.push('/')
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete recommendation')
      }
    } catch (error) {
      console.error('Error deleting recommendation:', error)
      alert('Failed to delete recommendation')
    } finally {
      setDeleting(false)
    }
  }

  if (!isOwner) {
    return (
      <Button variant="destructive" className="w-full gap-2" size="lg" disabled>
        <Trash2 className="h-5 w-5" />
        Delete
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full gap-2" size="lg">
          <Trash2 className="h-5 w-5" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Recommendation</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{recommendation.entity.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
