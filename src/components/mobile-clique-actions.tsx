"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CliqueManagementDialog } from "@/components/clique-management-dialog"
import { CliqueInviteDialog } from "@/components/clique-invite-dialog"

interface MobileCliqueActionsProps {
  /** ID of the clique being managed. */
  cliqueId: string
  /** Display name of the clique. */
  cliqueName: string
  /** ID of the currently authenticated user, used for permission checks. */
  currentUserId: string
}

/**
 * Compact action strip rendered in the mobile breadcrumb bar when viewing a
 * clique feed. Exposes the invite-member and clique-management dialogs as
 * icon buttons so users don't need to scroll to the bottom of the page.
 */
export function MobileCliqueActions({
  cliqueId,
  cliqueName,
  currentUserId,
}: MobileCliqueActionsProps) {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        aria-label="Add member to clique"
        onClick={() => setInviteOpen(true)}
      >
        <UserPlus className="h-4 w-4" />
      </Button>
      <CliqueManagementDialog
        cliqueId={cliqueId}
        cliqueName={cliqueName}
        currentUserId={currentUserId}
      />
      <CliqueInviteDialog
        cliqueId={cliqueId}
        cliqueName={cliqueName}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </div>
  )
}
