import { redirect } from "next/navigation"
import { BookMarked, CalendarDays, UsersRound } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { auth } from "@/lib/auth"
import { getPrismaClient } from "@/lib/prisma"

/**
 * Formats a date as a human-readable "member since" string.
 *
 * Uses a fixed en-US locale and UTC timezone so the rendered month/year is
 * stable regardless of the server's runtime locale or timezone.
 *
 * @param date - Account creation date
 * @returns Month + year in en-US, e.g. "February 2026"
 */
function formatMemberSince(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

/**
 * Profile page — server component.
 *
 * Shows the signed-in user's identity (avatar, name, email), account age,
 * and activity stats (recommendations shared, cliques joined).
 * Unauthenticated visitors are redirected to sign-in.
 */
export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }
  const userId = session.user.id

  const prisma = getPrismaClient()
  const [user, recommendationCount, cliqueCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true, createdAt: true },
    }),
    prisma.recommendation.count({ where: { userId } }),
    prisma.cliqueMember.count({ where: { userId } }),
  ])

  if (!user) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <Header session={session} showBack pageTitle="Profile" />

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.image || undefined} alt={user.name || "User avatar"} />
                <AvatarFallback className="text-xl">
                  {user.name?.[0] || user.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <CardTitle className="truncate text-2xl">{user.name || "Anonymous"}</CardTitle>
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Member since {formatMemberSince(user.createdAt)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                <dt className="flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <BookMarked className="h-3.5 w-3.5" aria-hidden="true" />
                  Recommendations
                </dt>
                <dd className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {recommendationCount}
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                <dt className="flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
                  Cliques
                </dt>
                <dd className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                  {cliqueCount}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/?mine=true">View my recommendations</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">Back to feed</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
