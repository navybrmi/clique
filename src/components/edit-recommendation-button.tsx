"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AddRecommendationDialog } from "@/components/add-recommendation-dialog"
import { Pencil } from "lucide-react"
import { useRouter } from "next/navigation"

interface EditRecommendationButtonProps {
  recommendation: any
}

export function EditRecommendationButton({ recommendation }: EditRecommendationButtonProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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

  // Only show edit button if the logged-in user is the owner
  if (loading || !session?.user || session.user.id !== recommendation.userId) {
    return null
  }

  return (
    <AddRecommendationDialog
      editMode={true}
      recommendationId={recommendation.id}
      initialData={recommendation}
      onSuccess={() => {
        router.refresh()
      }}
      trigger={
        <Button variant="outline" className="w-full gap-2" size="lg">
          <Pencil className="h-5 w-5" />
          Edit
        </Button>
      }
    />
  )
}
