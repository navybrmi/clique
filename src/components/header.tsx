"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
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
  /** Slot rendered on the left of the mobile header (e.g. hamburger menu). */
  mobileMenuSlot?: ReactNode
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
export function Header({ showBack, showCliqueHint, session, pageTitle, mobileMenuSlot }: HeaderProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white dark:bg-black">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 relative">

        {/* Mobile left: hamburger or back button */}
        <div className="flex items-center lg:hidden min-w-[40px]">
          {showBack ? (
            <Link href="/" aria-label="Back to home">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
          ) : (
            mobileMenuSlot ?? <div className="w-10" />
          )}
        </div>

        {/* Mobile center: Clique absolutely centered */}
        <Link href="/" className="lg:hidden absolute left-1/2 -translate-x-1/2">
          <h1 className="text-xl font-bold cursor-pointer hover:text-zinc-600 transition-colors">
            Clique
          </h1>
        </Link>

        {/* Desktop left: Clique + back + pageTitle/hint */}
        <div className="hidden lg:flex items-center gap-4">
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

        {/* Right: nav (always visible) */}
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
