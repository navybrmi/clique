"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Settings, Trash2, UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CliqueInviteDialog } from "@/components/clique-invite-dialog"
import type { CliqueInviteWithCreator, CliqueWithMembers } from "@/types/clique"

interface CliqueManagementDialogProps {
  cliqueId: string
  cliqueName: string
  currentUserId: string
}

type ManagementTab = "members" | "invites"

export function CliqueManagementDialog({
  cliqueId,
  cliqueName,
  currentUserId,
}: CliqueManagementDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ManagementTab>("members")
  const [clique, setClique] = useState<CliqueWithMembers | null>(null)
  const [invites, setInvites] = useState<CliqueInviteWithCreator[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null)
  const [isDeletingClique, setIsDeletingClique] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  const isCreator = clique?.creatorId === currentUserId

  const loadClique = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/cliques/${cliqueId}`, { cache: "no-store" })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(body?.error ?? "Failed to load clique")
        return
      }
      setClique(body as CliqueWithMembers)
    } catch {
      setError("Failed to load clique")
    } finally {
      setIsLoading(false)
    }
  }

  const loadInvites = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/cliques/${cliqueId}/invites`, { cache: "no-store" })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(body?.error ?? "Failed to load invites")
        return
      }
      setInvites(Array.isArray(body) ? (body as CliqueInviteWithCreator[]) : [])
    } catch {
      setError("Failed to load invites")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setTab("members")
      setError(null)
      void loadClique()
    } else {
      setClique(null)
      setInvites([])
      setError(null)
      setShowDeleteConfirm(false)
    }
  }

  const handleTabChange = (next: ManagementTab) => {
    setTab(next)
    setError(null)
    if (next === "members" && !clique) {
      void loadClique()
    } else if (next === "invites") {
      void loadInvites()
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setRemovingMemberId(userId)
    setError(null)
    try {
      const response = await fetch(`/api/cliques/${cliqueId}/members/${userId}`, {
        method: "DELETE",
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(body?.error ?? "Failed to remove member")
        return
      }
      setClique((prev) =>
        prev
          ? { ...prev, members: prev.members.filter((m) => m.userId !== userId) }
          : prev
      )
      router.refresh()
    } catch {
      setError("Failed to remove member")
    } finally {
      setRemovingMemberId(null)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingInviteId(inviteId)
    setError(null)
    try {
      const response = await fetch(
        `/api/cliques/${cliqueId}/invites/${inviteId}`,
        { method: "DELETE" }
      )
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(body?.error ?? "Failed to revoke invite")
        return
      }
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId))
    } catch {
      setError("Failed to revoke invite")
    } finally {
      setRevokingInviteId(null)
    }
  }

  const handleDeleteClique = async () => {
    setIsDeletingClique(true)
    setError(null)
    try {
      const response = await fetch(`/api/cliques/${cliqueId}`, {
        method: "DELETE",
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(body?.error ?? "Failed to delete clique")
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError("Failed to delete clique")
    } finally {
      setIsDeletingClique(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={`Manage ${cliqueName}`}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="truncate">{cliqueName}</DialogTitle>
            <DialogDescription>
              Manage members and invites for this clique.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tab switcher */}
            <div className="flex gap-1 rounded-md border p-1">
              <button
                type="button"
                data-testid="tab-members"
                onClick={() => handleTabChange("members")}
                className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === "members"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                Members
              </button>
              {isCreator && (
                <button
                  type="button"
                  data-testid="tab-invites"
                  onClick={() => handleTabChange("invites")}
                  className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === "invites"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  Invites
                </button>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <>
                {tab === "members" && clique && (
                  <div className="space-y-2">
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                      {clique.members.map((member) => (
                        <div
                          key={member.userId}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {member.user.name ?? member.user.email}
                            </p>
                            {clique.creatorId === member.userId && (
                              <p className="text-xs text-zinc-500">Creator</p>
                            )}
                          </div>
                          {isCreator && clique.creatorId !== member.userId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-zinc-400 hover:text-red-600"
                              aria-label={`Remove ${member.user.name ?? member.user.email}`}
                              disabled={removingMemberId === member.userId}
                              onClick={() => handleRemoveMember(member.userId)}
                            >
                              {removingMemberId === member.userId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserMinus className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3">
                      {showDeleteConfirm ? (
                        <div className="space-y-3">
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">
                            Delete &ldquo;{cliqueName}&rdquo;? This cannot be undone. Members will lose access to the feed.
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isDeletingClique}
                              onClick={() => setShowDeleteConfirm(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={isDeletingClique}
                              onClick={handleDeleteClique}
                            >
                              {isDeletingClique ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setInviteDialogOpen(true)}
                          >
                            Invite someone
                          </Button>
                          {isCreator && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                              onClick={() => setShowDeleteConfirm(true)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete clique
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tab === "invites" && (
                  <div className="space-y-2">
                    {invites.length === 0 ? (
                      <p className="text-sm text-zinc-500">No pending invites.</p>
                    ) : (
                      <div className="max-h-64 space-y-1 overflow-y-auto">
                        {invites.map((invite) => (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between gap-2 rounded-md px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                                {invite.email ?? "Link invite"}
                              </p>
                              <p className="text-xs text-zinc-400">
                                Expires{" "}
                                {new Date(invite.expiresAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0 text-zinc-400 hover:text-red-600"
                              aria-label="Revoke invite"
                              disabled={revokingInviteId === invite.id}
                              onClick={() => handleRevokeInvite(invite.id)}
                            >
                              {revokingInviteId === invite.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Revoke"
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInviteDialogOpen(true)}
                      >
                        Invite someone
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CliqueInviteDialog
        cliqueId={cliqueId}
        cliqueName={cliqueName}
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />
    </>
  )
}
