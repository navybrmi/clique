"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AcceptInviteButtonProps {
  token: string
  isLinkInvite: boolean
}

export function AcceptInviteButton({ token, isLinkInvite }: AcceptInviteButtonProps) {
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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

      if (body?.status === "pending" || body?.status === "already_pending") {
        setPending(true)
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

  if (pending) {
    return (
      <div className="space-y-3">
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Request submitted!
          </p>
          <p className="text-sm text-zinc-500">
            {isLinkInvite
              ? "The clique creator will review your request. You'll be notified once it's approved."
              : "Your request is pending approval."}
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Browse the app while you wait</Link>
        </Button>
      </div>
    )
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
            Sending request...
          </>
        ) : isLinkInvite ? (
          "Request to join"
        ) : (
          "Accept invite"
        )}
      </Button>
    </div>
  )
}
