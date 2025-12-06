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
// React 19 doesn't export act by default in some environments
const React = require('react')
const ReactDOM = require('react-dom')

if (typeof React.act === 'undefined') {
  // Try to get act from react-dom/client or react internals
  let actImpl = null
  
  try {
    // React 19 moved act to react-dom/client
    const ReactDOMClient = require('react-dom/client')
    if (ReactDOMClient.act) {
      actImpl = ReactDOMClient.act
    }
  } catch (e) {
    // Fallback: try unstable_act from react-dom
    if (ReactDOM.unstable_act) {
      actImpl = ReactDOM.unstable_act
    }
  }
  
  // If we found an implementation, use it
  if (actImpl) {
    React.act = actImpl
  } else {
    // Last resort: minimal implementation
    React.act = function act(callback) {
      const result = callback()
      if (result && typeof result.then === 'function') {
        return result.then(() => undefined)
      }
      return Promise.resolve(undefined)
    }
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

// Now mock fetch for tests with a more robust default
global.fetch = jest.fn((url) => {
  // Default mock response
  const defaultResponse = new Response(JSON.stringify([]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
  return Promise.resolve(defaultResponse)
})

// Reset fetch mock before each test
beforeEach(() => {
  global.fetch.mockClear()
})

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
