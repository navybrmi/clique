"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/notification-bell"
import { UserMenu } from "@/components/user-menu"
import { ArrowLeft } from "lucide-react"
import { signOut } from "next-auth/react"

/**
 * Props for the Header component
 */
interface HeaderProps {
  /** Whether to show the back button. Defaults to false. */
  showBack?: boolean
  /** Whether to show the top-of-page clique explainer tag. */
  showCliqueHint?: boolean
  /** Resolved session from the server component parent. */
  session?: { user?: { id?: string; name?: string | null; image?: string | null } } | null
  /** Optional page-level tagline rendered in the header at the same level as the app name. */
  pageTitle?: string
}

/**
 * Application header component with authentication UI.
 *
 * Accepts a `session` prop resolved server-side so no client-side fetch to
 * /api/auth/session is required. Shows sign-in buttons for unauthenticated
 * users and a user menu for authenticated users.
 *
 * @param props - Component props
 * @returns A sticky header with navigation and auth controls
 */
export function Header({ showBack, showCliqueHint, session, pageTitle }: HeaderProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <header className="sticky top-0 z-[100] border-b bg-white/50 backdrop-blur-sm dark:bg-black/50">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          {showBack && (
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          )}
          <Link href="/">
            <h1 className="text-xl font-bold cursor-pointer hover:text-zinc-600 transition-colors">
              Clique
            </h1>
          </Link>
          {pageTitle && (
            <>
              <span className="hidden h-8 w-px bg-zinc-300 dark:bg-zinc-700 md:block" aria-hidden="true" />
              <h2 className="hidden text-5xl font-bold tracking-tight md:block">
                {pageTitle}
              </h2>
            </>
          )}
          {!pageTitle && showCliqueHint && !showBack && (
            <span className="hidden rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 md:inline-flex dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
              🤝 A Clique = your mini crew for trusted recommendations.
            </span>
          )}
        </div>
        <nav className="flex items-center gap-2">
          {session?.user ? (
            isHydrated ? (
              <>
                <NotificationBell />
                <UserMenu user={session.user} onSignOut={handleSignOut} />
              </>
            ) : (
              <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            )
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signin">Get Started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
