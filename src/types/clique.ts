import type {
  Clique as PrismaClique,
  CliqueMember as PrismaCliqueMember,
  CliqueInvite as PrismaCliqueInvite,
  Notification as PrismaNotification,
  CliqueInviteStatus,
  NotificationType,
  CliqueMembershipRequestStatus,
} from "@/lib/generated/prisma/client"

export type { CliqueInviteStatus, NotificationType, CliqueMembershipRequestStatus }

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
      restaurant?: {
        cuisine?: string | null
        location?: string | null
        priceRange?: string | null
      } | null
      movie?: {
        director?: string | null
        year?: number | null
        genre?: string | null
        duration?: string | null
      } | null
      fashion?: Record<string, unknown> | null
      household?: Record<string, unknown> | null
      other?: Record<string, unknown> | null
    }
    _count: {
      upvotes: number
      comments: number
    }
  }
}

/** Pending join request returned by GET /api/cliques/[id]/membership-requests */
export interface CliqueMembershipRequest {
  id: string
  cliqueId: string
  userId: string
  inviteToken: string
  status: CliqueMembershipRequestStatus
  createdAt: Date
  resolvedAt: Date | null
  user: {
    id: string
    name: string | null
    image: string | null
  }
}

/** Discriminated union for notification payloads */
export type NotificationPayload =
  | CliqueInvitePayload
  | CliqueJoinRequestPayload
  | CliqueJoinApprovedPayload
  | CliqueJoinRejectedPayload

export interface CliqueInvitePayload {
  type: "CLIQUE_INVITE"
  cliqueId: string
  cliqueName: string
  invitedById: string
  invitedByName: string | null
  inviteToken: string
}

export interface CliqueJoinRequestPayload {
  type: "CLIQUE_JOIN_REQUEST"
  cliqueId: string
  cliqueName: string
  requestId: string
  requesterId: string
  requesterName: string | null
  requesterImage: string | null
}

export interface CliqueJoinApprovedPayload {
  type: "CLIQUE_JOIN_APPROVED"
  cliqueId: string
  cliqueName: string
}

export interface CliqueJoinRejectedPayload {
  type: "CLIQUE_JOIN_REJECTED"
  cliqueId: string
  cliqueName: string
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
