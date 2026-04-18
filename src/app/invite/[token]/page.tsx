import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { AcceptInviteButton } from "./accept-invite-button"

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params

  const invite = await prisma.cliqueInvite.findUnique({
    where: { token },
    include: { clique: { select: { name: true } } },
  })

  if (!invite) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Invalid invite link</h1>
          <p className="text-zinc-500">
            This invite link doesn&apos;t exist or has already been used.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </main>
    )
  }

  const cliqueName = invite.clique.name
  const isExpired = invite.expiresAt < new Date()

  if (invite.status !== "PENDING" || isExpired) {
    const reason =
      invite.status === "ACCEPTED"
        ? "This invite has already been accepted."
        : invite.status === "REVOKED"
          ? "This invite has been revoked by the sender."
          : "This invite has expired."

    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Invite unavailable</h1>
          <p className="text-zinc-500">{reason}</p>
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </main>
    )
  }

  const session = await auth()

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-white p-8 shadow-sm dark:bg-zinc-950">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            You&apos;re invited to join
          </p>
          <h1 className="text-3xl font-bold">{cliqueName}</h1>
          <p className="text-sm text-zinc-500">
            Accept to start seeing this clique&apos;s recommendations feed.
          </p>
        </div>

        {session?.user ? (
          <AcceptInviteButton token={token} />
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-zinc-500">
              Sign in first to accept this invite.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href={`/auth/signin?callbackUrl=/invite/${token}`}>
                Sign in to accept
              </Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
