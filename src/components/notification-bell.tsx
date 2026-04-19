"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TypedNotification } from "@/types/clique"

export function NotificationBell() {
  const [notifications, setNotifications] = useState<TypedNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      if (!response.ok) return
      const data = await response.json().catch(() => [])
      setNotifications(Array.isArray(data) ? (data as TypedNotification[]) : [])
    } catch {
      // Best-effort — bell just shows no notifications on error
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [isOpen])

  const handleToggle = () => {
    const opening = !isOpen
    setIsOpen(opening)
    if (opening) void loadNotifications()
  }

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch("/api/notifications", { method: "PATCH" })
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      }
    } catch {
      // Best-effort
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      })
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        )
      }
    } catch {
      // Best-effort
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={
          unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"
        }
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            data-testid="unread-badge"
            className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          data-testid="notification-panel"
          className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border bg-white shadow-lg dark:bg-zinc-950"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-0.5 text-xs"
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="Close notifications"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-zinc-500">
                No notifications yet.
              </p>
            ) : (
              notifications.map((notification) => {
                const payload = notification.payload

                if (payload.type === "CLIQUE_INVITE") {
                  return (
                    <Link
                      key={notification.id}
                      href={`/invite/${payload.inviteToken}`}
                      onClick={() => {
                        if (!notification.read) void handleMarkRead(notification.id)
                        setIsOpen(false)
                      }}
                      className={`flex flex-col gap-0.5 px-3 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 ${
                        !notification.read ? "bg-zinc-50 dark:bg-zinc-900/60" : ""
                      }`}
                    >
                      <span className="font-medium">
                        {payload.invitedByName ?? "Someone"} invited you to{" "}
                        <span className="font-semibold">{payload.cliqueName}</span>
                      </span>
                      <span className="text-xs text-zinc-500">Tap to view invite</span>
                      {!notification.read && (
                        <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                    </Link>
                  )
                }

                return (
                  <div
                    key={notification.id}
                    className="px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    New notification
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
