"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut } from "next-auth/react"

/**
 * Props for the UserMenu component
 */
interface UserMenuProps {
  /** User information from authentication session */
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  /** Optional custom sign-out handler. If not provided, uses default NextAuth signOut */
  onSignOut?: () => void
}

/**
 * Dropdown menu component for authenticated user actions.
 * 
 * Displays user avatar and provides access to sign-out functionality.
 * Shows user name and email in the dropdown menu.
 * 
 * @param props - Component props
 * @returns A dropdown menu with user info and actions
 */
export function UserMenu({ user, onSignOut }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar>
            <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
            <AvatarFallback>{user.name?.[0] || user.email?.[0] || "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/my-recommendations">My Recommendations</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut || (() => signOut())} className="text-red-600">
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
