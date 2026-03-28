"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/user-menu"
import { ArrowLeft } from "lucide-react"
import { signOut } from "next-auth/react"

/**
 * Props for the Header component
 */
interface HeaderProps {
  /** Whether to show the back button. Defaults to false. */
  showBack?: boolean
  /** Resolved session from the server component parent. */
  session?: { user?: { id?: string; name?: string | null; image?: string | null } } | null
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
export function Header({ showBack, session }: HeaderProps) {
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-black/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
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
        </div>
        <nav className="flex items-center gap-4">
          {session?.user ? (
            <UserMenu user={session.user} onSignOut={handleSignOut} />
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
