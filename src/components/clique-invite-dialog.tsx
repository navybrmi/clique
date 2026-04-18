"use client"

import { type FormEvent, useState } from "react"
import { Copy, Loader2, Mail } from "lucide-react"
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
  open: boolean
  onOpenChange: (open: boolean) => void
}

type InviteTab = "link" | "email"

export function CliqueInviteDialog({
  cliqueId,
  open,
  onOpenChange,
}: CliqueInviteDialogProps) {
  const [tab, setTab] = useState<InviteTab>("link")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  const resetState = () => {
    setTab("link")
    setEmail("")
    setIsSubmitting(false)
    setError(null)
    setGeneratedLink(null)
    setEmailSuccess(false)
    setCopied(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState()
    onOpenChange(next)
  }

  const handleTabChange = (next: InviteTab) => {
    setTab(next)
    setError(null)
    setGeneratedLink(null)
    setEmailSuccess(false)
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

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError("Email is required")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/cliques/${cliqueId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", email: trimmedEmail }),
      })
      const body = await response.json().catch(() => null)

      if (!response.ok) {
        setError(body?.error ?? "Failed to send invite")
        return
      }

      setEmailSuccess(true)
      setEmail("")
    } catch {
      setError("Failed to send invite")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to Clique</DialogTitle>
          <DialogDescription>
            Share a link or invite someone by email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab switcher */}
          <div className="flex gap-1 rounded-md border p-1">
            <button
              type="button"
              data-testid="tab-link"
              onClick={() => handleTabChange("link")}
              className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "link"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Share link
            </button>
            <button
              type="button"
              data-testid="tab-email"
              onClick={() => handleTabChange("email")}
              className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "email"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Invite by email
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {tab === "link" && (
            <div className="space-y-3">
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
                    This link expires in 7 days and can be used once.
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "email" && (
            <div className="space-y-3">
              {emailSuccess ? (
                <div className="flex items-center gap-2 rounded-md bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  <Mail className="h-4 w-4 shrink-0" />
                  Invite sent! They&apos;ll receive an email with a link to join.
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="friend@example.com"
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!email.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send invite"
                    )}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
