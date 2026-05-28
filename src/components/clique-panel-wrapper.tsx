import { getPrismaClient } from "@/lib/prisma"
import { CliquePanel, type CliquePanelMember } from "@/components/clique-panel"

interface CliquePanelWrapperProps {
  cliqueId: string
  cliqueName: string
  currentUserId: string
}

export async function CliquePanelWrapper({
  cliqueId,
  cliqueName,
  currentUserId,
}: CliquePanelWrapperProps) {
  const prisma = getPrismaClient()

  const [rows, pendingCountRows] = await Promise.all([
    prisma.$queryRaw<
      { userId: string; name: string | null; email: string; image: string | null; creatorId: string }[]
    >`
      SELECT cm."userId", u.name, u.email, u.image, c."creatorId"
      FROM "CliqueMember" cm
      JOIN "User" u ON u.id = cm."userId"
      JOIN "Clique" c ON c.id = cm."cliqueId"
      WHERE cm."cliqueId" = ${cliqueId}
      ORDER BY cm."joinedAt" ASC
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count
      FROM "CliqueMembershipRequest"
      WHERE "cliqueId" = ${cliqueId}
        AND "userId" != ${currentUserId}
        AND status = 'PENDING'
        AND EXISTS (
          SELECT 1 FROM "Clique" WHERE id = ${cliqueId} AND "creatorId" = ${currentUserId}
        )
    `,
  ])

  const members: CliquePanelMember[] = rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    email: r.email,
    image: r.image,
    isCreator: r.userId === r.creatorId,
  }))

  const pendingRequestCount = Number(pendingCountRows[0]?.count ?? 0)

  return (
    <CliquePanel
      cliqueId={cliqueId}
      cliqueName={cliqueName}
      currentUserId={currentUserId}
      members={members}
      pendingRequestCount={pendingRequestCount}
    />
  )
}
