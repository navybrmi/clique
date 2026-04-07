/**
 * Tests for auth configuration, specifically verifying that the Facebook
 * provider is configured correctly to avoid PKCE-related sign-in failures.
 */

// Mock next-auth and its providers before importing auth config
jest.mock('next-auth', () => {
  return jest.fn((config: Record<string, unknown>) => ({
    handlers: {},
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    _config: config,
  }))
})

jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(() => ({})),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {},
}))

const mockFacebook = jest.fn((options: Record<string, unknown>) => ({
  id: 'facebook',
  ...options,
}))

const mockGoogle = jest.fn((options: Record<string, unknown>) => ({
  id: 'google',
  ...options,
}))

jest.mock('next-auth/providers/facebook', () => mockFacebook)
jest.mock('next-auth/providers/google', () => mockGoogle)

describe('auth configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('Facebook provider', () => {
    it('is not registered when FACEBOOK_ID or FACEBOOK_SECRET are missing', async () => {
      delete process.env.FACEBOOK_ID
      delete process.env.FACEBOOK_SECRET

      const NextAuth = require('next-auth')
      require('next-auth/providers/facebook')
      require('next-auth/providers/google')
      require('@/lib/auth')

      const config = NextAuth.mock.calls[NextAuth.mock.calls.length - 1][0]
      const facebookProvider = config.providers.find(
        (p: { id: string }) => p.id === 'facebook'
      )
      expect(facebookProvider).toBeUndefined()
    })

    it('is registered with checks: ["state"] to avoid PKCE failures through Facebook GDPR consent flow', async () => {
      process.env.FACEBOOK_ID = 'test-fb-id'
      process.env.FACEBOOK_SECRET = 'test-fb-secret'

      const NextAuth = require('next-auth')
      require('@/lib/auth')

      const config = NextAuth.mock.calls[NextAuth.mock.calls.length - 1][0]
      const facebookProvider = config.providers.find(
        (p: { id: string }) => p.id === 'facebook'
      )

      expect(facebookProvider).toBeDefined()
      // Auth.js v5 defaults to PKCE for all providers. Facebook's GDPR consent
      // flow uses a POST redirect back to the callback, which drops SameSite=Lax
      // cookies (including the pkceCodeVerifier), causing a silent auth failure.
      // We must explicitly use state-only checks to avoid this.
      expect(facebookProvider.checks).toEqual(['state'])
    })

    it('is configured with the correct client credentials', async () => {
      process.env.FACEBOOK_ID = 'my-fb-app-id'
      process.env.FACEBOOK_SECRET = 'my-fb-app-secret'

      const NextAuth = require('next-auth')
      require('@/lib/auth')

      const config = NextAuth.mock.calls[NextAuth.mock.calls.length - 1][0]
      const facebookProvider = config.providers.find(
        (p: { id: string }) => p.id === 'facebook'
      )

      expect(facebookProvider.clientId).toBe('my-fb-app-id')
      expect(facebookProvider.clientSecret).toBe('my-fb-app-secret')
    })
  })

  describe('Google provider', () => {
    it('is not registered when GOOGLE_ID or GOOGLE_SECRET are missing', async () => {
      delete process.env.GOOGLE_ID
      delete process.env.GOOGLE_SECRET

      const NextAuth = require('next-auth')
      require('@/lib/auth')

      const config = NextAuth.mock.calls[NextAuth.mock.calls.length - 1][0]
      const googleProvider = config.providers.find(
        (p: { id: string }) => p.id === 'google'
      )
      expect(googleProvider).toBeUndefined()
    })

    it('is registered with allowDangerousEmailAccountLinking: false', async () => {
      process.env.GOOGLE_ID = 'test-google-id'
      process.env.GOOGLE_SECRET = 'test-google-secret'

      const NextAuth = require('next-auth')
      require('@/lib/auth')

      const config = NextAuth.mock.calls[NextAuth.mock.calls.length - 1][0]
      const googleProvider = config.providers.find(
        (p: { id: string }) => p.id === 'google'
      )

      expect(googleProvider).toBeDefined()
      expect(googleProvider.allowDangerousEmailAccountLinking).toBe(false)
    })
  })

  describe('session configuration', () => {
    it('uses database strategy', async () => {
      const NextAuth = require('next-auth')
      require('@/lib/auth')

      const config = NextAuth.mock.calls[NextAuth.mock.calls.length - 1][0]
      expect(config.session.strategy).toBe('database')
    })
  })

  describe('session callback', () => {
    it('populates session.user.id from the database user record', async () => {
      const NextAuth = require('next-auth')
      require('@/lib/auth')

      const config = NextAuth.mock.calls[NextAuth.mock.calls.length - 1][0]
      const session = { user: { name: 'Test' } }
      const user = { id: 'user-123' }

      const result = config.callbacks.session({ session, user })
      expect(result.user.id).toBe('user-123')
    })
  })
})
