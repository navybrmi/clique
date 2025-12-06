import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Facebook from "next-auth/providers/facebook"
import Google from "next-auth/providers/google"

/**
 * Authentication providers array.
 * Dynamically includes OAuth providers based on environment variable configuration.
 * Supports Facebook and Google authentication.
 */
const providers = []

if (process.env.FACEBOOK_ID && process.env.FACEBOOK_SECRET) {
  providers.push(
    Facebook({
      clientId: process.env.FACEBOOK_ID,
      clientSecret: process.env.FACEBOOK_SECRET,
    })
  )
}

if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    })
  )
}

/**
 * NextAuth.js configuration and exported utilities.
 * 
 * @property handlers - HTTP handlers for /api/auth/* routes
 * @property auth - Server-side authentication helper
 * @property signIn - Programmatic sign-in function
 * @property signOut - Programmatic sign-out function
 * 
 * Configuration includes:
 * - Prisma database adapter for session storage
 * - OAuth providers (Facebook, Google)
 * - Custom sign-in page
 * - Session callback to include user ID
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})
