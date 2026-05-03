"use client"

import { useState } from "react"
import { Settings, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CliqueManagementDialog } from "@/components/clique-management-dialog"
import { CliqueInviteDialog } from "@/components/clique-invite-dialog"

interface MobileCliqueActionsProps {
  cliqueId: string
  cliqueName: string
  currentUserId: string
}

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
