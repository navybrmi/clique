"use client"

import { useState } from "react"
import { UserPlus, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CliqueManagementDialog } from "@/components/clique-management-dialog"
import { CliqueInviteDialog } from "@/components/clique-invite-dialog"

export type CliquePanelMember = {
  userId: string
  name: string | null
  email: string
  image: string | null
  isCreator: boolean
}

interface CliquePanelProps {
  cliqueId: string
  cliqueName: string
  currentUserId: string
  members: CliquePanelMember[]
}

function MemberAvatar({ member }: { member: CliquePanelMember }) {
  const initials = (member.name ?? member.email)
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("")

  if (member.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.image}
        alt={member.name ?? member.email}
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
      {initials}
    </div>
  )
}

export function CliquePanel({
  cliqueId,
  cliqueName,
  currentUserId,
  members,
}: CliquePanelProps) {
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <>
      <aside className="sticky top-24 space-y-4 rounded-xl border bg-white/70 p-4 backdrop-blur-sm dark:bg-zinc-950/70">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {cliqueName}
          </p>
          <CliqueManagementDialog
            cliqueId={cliqueId}
            cliqueName={cliqueName}
            currentUserId={currentUserId}
          />
        </div>

        {/* Members section */}
        <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              Members
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Add member"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <ul className="space-y-1">
            {members.map((member) => (
              <li key={member.userId} className="flex items-center gap-2 rounded-md px-1 py-1">
                <MemberAvatar member={member} />
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
                  {member.name ?? member.email}
                </span>
                {member.isCreator && (
                  <Crown className="h-3 w-3 shrink-0 text-amber-400" aria-label="Creator" />
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <CliqueInviteDialog
        cliqueId={cliqueId}
        cliqueName={cliqueName}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </>
  )
}
