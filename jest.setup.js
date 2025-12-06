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

// Provide React.act implementation for @testing-library/react
// We need to set this up before @testing-library/react is imported
const React = require('react')
const ReactDOM = require('react-dom')

// Create a proper act implementation
if (!React.act) {
  const actImpl = (callback) => {
    const result = callback()
    // If the callback returns a thenable (Promise-like), return it
    if (result !== null && typeof result === 'object' && typeof result.then === 'function') {
      return result.then(
        () => undefined,
        (error) => {
          throw error
        }
      )
    }
    // Otherwise, return an immediately resolved promise
    return Promise.resolve(undefined)
  }
  
  // Set act on both React and ReactDOM for compatibility
  React.act = actImpl
  if (ReactDOM.unstable_act) {
    ReactDOM.act = ReactDOM.unstable_act
  } else if (!ReactDOM.act) {
    ReactDOM.act = actImpl
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
