import '@testing-library/jest-dom'
// Mock Radix Portal to render children inline for tests
jest.mock('@radix-ui/react-portal', () => ({
  __esModule: true,
  Portal: ({ children }: { children: React.ReactNode }) => children,
}))
// Polyfill for Radix UI + JSDOM pointer events
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
import { render, screen, waitFor } from '@testing-library/react'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})

// Mock next/image
jest.mock('next/image', () => {
  return ({ src, alt, ...props }: any) => <img src={src} alt={alt} />
})

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'user1', name: 'Test User' } },
    status: 'authenticated',
  }),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Polyfill scrollIntoView
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = function () { return undefined }
})

import React from 'react'
import HomePage from '../page'

const mockRestaurantRec = {
  id: 'rec-restaurant-1',
  tags: ['Great food'],
  rating: 8,
  imageUrl: null,
  link: 'https://example.com',
  user: { name: 'Test User' },
  entity: {
    name: 'SAJJ Mediterranean',
    category: { displayName: 'Restaurant' },
    restaurant: {
      cuisine: 'Mediterranean',
      location: '145 S Frances St, Sunnyvale, CA',
      priceRange: '$$',
      hours: 'Monday: 11:00 AM - 9:00 PM',
    },
  },
  _count: { upvotes: 5, comments: 2 },
}

const mockMovieRec = {
  id: 'rec-movie-1',
  tags: ['Must watch'],
  rating: 9,
  imageUrl: null,
  link: null,
  user: { name: 'Test User' },
  entity: {
    name: 'Inception',
    category: { displayName: 'Movie' },
    movie: {
      director: 'Christopher Nolan',
      releaseYear: 2010,
      genre: 'Sci-Fi',
      duration: 148,
    },
  },
  _count: { upvotes: 10, comments: 3 },
}

function setupFetchMock(recommendations: any[]) {
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/api/auth/session')) {
      return Promise.resolve(new Response(JSON.stringify({ user: { id: 'user1', name: 'Test User' } })))
    }
    if (url.includes('/api/categories')) {
      return Promise.resolve(new Response(JSON.stringify([
        { id: '1', name: 'MOVIE', displayName: 'Movie' },
        { id: '2', name: 'RESTAURANT', displayName: 'Restaurant' },
      ])))
    }
    if (url.includes('/api/recommendations')) {
      return Promise.resolve(new Response(JSON.stringify(recommendations)))
    }
    if (url.includes('/api/tags')) {
      return Promise.resolve(new Response(JSON.stringify({ tags: [] })))
    }
    return Promise.resolve(new Response(JSON.stringify({})))
  }) as jest.Mock
}

describe('HomePage - Recommendation Cards', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should display restaurant cuisine, location, and price range on cards', async () => {
    setupFetchMock([mockRestaurantRec, mockMovieRec])
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getAllByText('SAJJ Mediterranean').length).toBeGreaterThan(0)
    })

    expect(screen.getByText(/Cuisine: Mediterranean/)).toBeInTheDocument()
    expect(screen.getByText(/145 S Frances St, Sunnyvale, CA/)).toBeInTheDocument()
    expect(screen.getByText(/Price: \$\$/)).toBeInTheDocument()
  })

  it('should display movie details on movie cards', async () => {
    setupFetchMock([mockMovieRec])
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getAllByText('Inception').length).toBeGreaterThan(0)
    })

    expect(screen.getByText(/Director: Christopher Nolan/)).toBeInTheDocument()
    expect(screen.getByText(/Genre: Sci-Fi/)).toBeInTheDocument()
  })

  it('should not show restaurant fields on non-restaurant cards', async () => {
    setupFetchMock([mockMovieRec])
    render(<HomePage />)

    await waitFor(() => {
      expect(screen.getAllByText('Inception').length).toBeGreaterThan(0)
    })

    expect(screen.queryByText(/Cuisine:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/145 S Frances St/)).not.toBeInTheDocument()
  })
})
