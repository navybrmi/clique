"use client"

import { useState } from "react"
import { Copy, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CliqueInviteDialogProps {
  cliqueId: string
  cliqueName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CliqueInviteDialog({
  cliqueId,
  cliqueName,
  open,
  onOpenChange,
}: CliqueInviteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const resetState = () => {
    setIsSubmitting(false)
    setError(null)
    setGeneratedLink(null)
    setCopied(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState()
    onOpenChange(next)
  }

  const handleGenerateLink = async () => {
    setIsSubmitting(true)
    setError(null)
    setGeneratedLink(null)

    try {
      const response = await fetch(`/api/cliques/${cliqueId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "link" }),
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        setError(body?.error ?? "Failed to generate invite link")
        return
      }

      const token = body?.token as string | undefined
      if (token) {
        const origin = typeof window !== "undefined" ? window.location.origin : ""
        setGeneratedLink(`${origin}/invite/${token}`)
      }
    } catch {
      setError("Failed to generate invite link")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the text
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to {cliqueName}</DialogTitle>
          <DialogDescription>
            Share an invite link with someone you&apos;d like to add.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!generatedLink ? (
            <Button
              type="button"
              onClick={handleGenerateLink}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate invite link"
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <Label>Invite link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={generatedLink}
                  data-testid="invite-link-input"
                  className="flex-1 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy link"
                  onClick={handleCopy}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-zinc-500">Copied to clipboard!</p>
              )}
              <p className="text-xs text-zinc-500">
                This link expires in 1 year and can be used once.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
