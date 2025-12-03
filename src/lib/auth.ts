import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Facebook from "next-auth/providers/facebook"
import Google from "next-auth/providers/google"

// Build providers array dynamically based on available credentials
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
