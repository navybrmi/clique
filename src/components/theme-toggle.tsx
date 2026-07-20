"use client"

import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { THEME_STORAGE_KEY } from "@/lib/theme"

/**
 * Subscribes to theme changes by watching the <html> class attribute, so the
 * toggle reflects any same-document change to the theme class (e.g. the
 * bootstrap script or another component instance). Cross-tab changes are not
 * observed; each tab resolves its own theme on load.
 */
function subscribeToThemeClass(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => observer.disconnect()
}

function readIsDark(): boolean {
  return document.documentElement.classList.contains("dark")
}

/** Server snapshot — the server can't know the client theme; assume light. */
function readIsDarkServer(): boolean {
  return false
}

/**
 * Header button that switches between light and dark themes.
 *
 * The bootstrap script in the root layout applies the initial theme class
 * before hydration; this component mirrors that state and lets the user
 * override it, persisting the explicit choice to localStorage.
 *
 * @returns An icon button reflecting the active theme
 */
export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribeToThemeClass,
    readIsDark,
    readIsDarkServer
  )

  const toggle = () => {
    const next = !isDark
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light")
    } catch {
      // Storage unavailable (private browsing) — theme still applies for the session.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="h-10 w-10 rounded-full p-0"
    >
      {isDark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </Button>
  )
}
