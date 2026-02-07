import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers

// Ensure dynamic rendering for auth routes to prevent caching issues
export const dynamic = 'force-dynamic'
