import type {
  Clique as PrismaClique,
  CliqueMember as PrismaCliqueMember,
  CliqueInvite as PrismaCliqueInvite,
  Notification as PrismaNotification,
  CliqueInviteStatus,
  NotificationType,
} from "@prisma/client"

export type { CliqueInviteStatus, NotificationType }

/** Clique with member count */
export interface CliqueWithMemberCount extends PrismaClique {
  _count: {
    members: number
  }
}

/** Clique with full member details */
export interface CliqueWithMembers extends PrismaClique {
  members: (PrismaCliqueMember & {
    user: {
      id: string
      name: string | null
      image: string | null
      email: string
    }
  })[]
  creator: {
    id: string
    name: string | null
    image: string | null
  }
  _count: {
    members: number
  }
}

/** Clique invite with creator info */
export interface CliqueInviteWithCreator extends PrismaCliqueInvite {
  createdBy: {
    id: string
    name: string | null
  }
}

/** Clique invite lookup result (public-facing, minimal info) */
export interface CliqueInviteLookup {
  id: string
  cliqueName: string
  status: CliqueInviteStatus
  expiresAt: Date
}

/** Recommendation in a clique feed with submitter visibility applied */
export interface CliqueFeedItem {
  id: string
  recommendationId: string
  addedAt: Date
  /** Name of the submitter — only shown if the submitter is a clique member */
  submitterName: string | null
  /** Name of the member who added/bookmarked this recommendation to the clique */
  addedByName: string | null
  recommendation: {
    id: string
    tags: string[]
    link: string | null
    imageUrl: string | null
    rating: number | null
    createdAt: Date
    entity: {
      id: string
      name: string
      category: {
        id: string
        name: string
        displayName: string
      }
    }
    _count: {
      upvotes: number
      comments: number
    }
  }
}

/** Discriminated union for notification payloads */
export type NotificationPayload = CliqueInvitePayload

export interface CliqueInvitePayload {
  type: "CLIQUE_INVITE"
  cliqueId: string
  cliqueName: string
  invitedById: string
  invitedByName: string | null
  inviteToken: string
}

/** Notification with typed payload */
export interface TypedNotification
  extends Omit<PrismaNotification, "payload" | "type"> {
  type: NotificationType
  payload: NotificationPayload
}

/** Minimal clique info for sidebar/navigation */
export interface CliqueSidebarItem {
  id: string
  name: string
}
