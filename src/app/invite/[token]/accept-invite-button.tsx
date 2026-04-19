"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AcceptInviteButtonProps {
  token: string
}

export function AcceptInviteButton({ token }: AcceptInviteButtonProps) {
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    setIsAccepting(true)
    setError(null)

    try {
      const response = await fetch(`/api/invites/${token}`, { method: "POST" })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        setError(body?.error ?? "Failed to accept invite")
        return
      }

      const cliqueId = body?.cliqueId as string | undefined
      // Hard redirect so the server re-renders CliqueSidebarWrapper with the new membership
      window.location.href = cliqueId ? `/?cliqueId=${cliqueId}` : "/"
    } catch {
      setError("Failed to accept invite")
    } finally {
      setIsAccepting(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        onClick={handleAccept}
        disabled={isAccepting}
        size="lg"
        className="w-full"
      >
        {isAccepting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Joining...
          </>
        ) : (
          "Accept invite"
        )}
      </Button>
    </div>
  )
}
