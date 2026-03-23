import { handlers } from "@/lib/auth"

/**
 * NextAuth.js HTTP handlers for the catch-all `/api/auth/[...nextauth]` route.
 *
 * Delegates all GET and POST requests to the NextAuth handler configured in
 * `@/lib/auth`, which covers sign-in, sign-out, session, and OAuth callback
 * flows for Google and Facebook providers.
 *
 * @see https://authjs.dev/getting-started/installation
 */
export const { GET, POST } = handlers

/**
 * Forces Next.js to render this route dynamically on every request, preventing
 * the auth session and CSRF token from being incorrectly cached at build time.
 */
export const dynamic = 'force-dynamic'
