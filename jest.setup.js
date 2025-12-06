import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { Blob } from 'buffer'

// Polyfill TextEncoder/TextDecoder for Node environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill Blob
if (!global.Blob) {
  global.Blob = Blob
}

// Mock Response class for tests
class MockResponse {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.statusText = init.statusText || 'OK'
    this.headers = new Map(Object.entries(init.headers || {}))
    this.ok = this.status >= 200 && this.status < 300
  }

  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body)
    }
    return this.body
  }

  async text() {
    if (typeof this.body === 'string') {
      return this.body
    }
    return JSON.stringify(this.body)
  }

  // Add static json method for NextResponse.json()
  static json(data, init = {}) {
    return new MockResponse(data, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    })
  }
}

global.Response = MockResponse

// Mock fetch globally with a default implementation
global.fetch = jest.fn(() =>
  Promise.resolve(
    new MockResponse(JSON.stringify({}), {
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
