"use client"

import { useState, useEffect } from "react"
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

interface DeleteRecommendationButtonProps {
  recommendation: any
}

export function DeleteRecommendationButton({ recommendation }: DeleteRecommendationButtonProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setSession(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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

  // Only show delete button if the logged-in user is the owner
  if (loading || !session?.user || session.user.id !== recommendation.userId) {
    return null
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
