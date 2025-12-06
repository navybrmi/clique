require('@testing-library/jest-dom')

const { TextEncoder, TextDecoder } = require('util')
const { ReadableStream, TransformStream } = require('stream/web')
const { MessageChannel, MessagePort } = require('worker_threads')

// Set up all polyfills BEFORE importing undici
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.ReadableStream = ReadableStream
global.TransformStream = TransformStream
global.MessageChannel = MessageChannel
global.MessagePort = MessagePort

// Provide React.act for testing-library
// React 19 doesn't export act by default, so we need to add it
const React = require('react')
if (typeof React.act === 'undefined') {
  // Use a minimal act implementation that handles sync and async operations
  React.act = function act(callback) {
    const result = callback()
    if (result && typeof result.then === 'function') {
      return result.then(() => undefined)
    }
    return Promise.resolve(undefined)
  }
}

// Now import undici for Web API polyfills
const { fetch, Request, Response, Headers, FormData } = require('undici')

// Polyfill Web APIs
global.fetch = fetch
global.Request = Request
global.Response = Response
global.Headers = Headers
global.FormData = FormData

// Now mock fetch for tests
global.fetch = jest.fn(() =>
  Promise.resolve(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  )
)

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
      route: '/',
      refresh: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  notFound: jest.fn(),
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.DATABASE_URL = 'postgresql://test'
process.env.TMDB_API_KEY = 'test-tmdb-key'
process.env.GOOGLE_PLACES_API_KEY = 'test-google-key'
