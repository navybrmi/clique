import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})

// Mock next/image
jest.mock('next/image', () => {
  return ({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) => (
    <img src={src} alt={alt} data-priority={priority ? 'true' : undefined} />
  )
})

// Mock Header to isolate page tests from session fetching
jest.mock('@/components/header', () => ({
  Header: () => <header data-testid="mock-header" />,
}))

// Mock AddRecommendationTrigger to isolate page tests from dynamic imports
jest.mock('@/components/add-recommendation-trigger', () => ({
  AddRecommendationTrigger: () => <div data-testid="mock-trigger" />,
}))

// Mock getRecommendations so tests don't hit the database
jest.mock('@/lib/recommendations', () => ({
  getRecommendations: jest.fn(),
}))

// Mock auth so tests don't pull in next-auth ESM module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}))

import { getRecommendations } from '@/lib/recommendations'
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
    },
    movie: null,
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
      year: 2010,
      genre: 'Sci-Fi',
      duration: '2h 28m',
    },
    restaurant: null,
  },
  _count: { upvotes: 10, comments: 3 },
}

const mockRecWithImage = {
  id: 'rec-image-1',
  tags: [],
  rating: 7,
  imageUrl: 'https://example.com/image.jpg',
  link: null,
  user: { name: 'Test User' },
  entity: {
    name: 'Interstellar',
    category: { displayName: 'Movie' },
    movie: { director: 'Nolan', year: 2014, genre: 'Sci-Fi', duration: '2h 49m' },
    restaurant: null,
  },
  _count: { upvotes: 3, comments: 1 },
}

describe('HomePage - Server Component', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders recommendation cards with server-fetched data (no fetch call)', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockRestaurantRec, mockMovieRec])
    const jsx = await HomePage()
    render(jsx)

    expect(screen.getAllByText('SAJJ Mediterranean').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Inception').length).toBeGreaterThan(0)
    // Verify no client-side fetch to /api/recommendations was made
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/recommendations'),
      expect.anything()
    )
  })

  it('displays restaurant cuisine, location, and price range', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockRestaurantRec])
    render(await HomePage())

    expect(screen.getByText(/Cuisine: Mediterranean/)).toBeInTheDocument()
    expect(screen.getByText(/145 S Frances St, Sunnyvale, CA/)).toBeInTheDocument()
    expect(screen.getByText(/Price: \$\$/)).toBeInTheDocument()
  })

  it('displays movie details on movie cards', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockMovieRec])
    render(await HomePage())

    expect(screen.getByText(/Director: Christopher Nolan/)).toBeInTheDocument()
    expect(screen.getByText(/Genre: Sci-Fi/)).toBeInTheDocument()
  })

  it('does not show restaurant fields on movie cards', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockMovieRec])
    render(await HomePage())

    expect(screen.queryByText(/Cuisine:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/145 S Frances St/)).not.toBeInTheDocument()
  })

  it('renders empty state when no recommendations exist', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([])
    render(await HomePage())

    expect(
      screen.getByText('No recommendations yet. Be the first to add one!')
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /SAJJ/i })).not.toBeInTheDocument()
  })

  it('renders the AddRecommendationTrigger', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([])
    render(await HomePage())

    expect(screen.getByTestId('mock-trigger')).toBeInTheDocument()
  })

  it('sets priority on the first card image and not subsequent ones', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([
      mockRecWithImage,
      { ...mockRecWithImage, id: 'rec-image-2', entity: { ...mockRecWithImage.entity, name: 'Second' } },
    ])
    render(await HomePage())

    const images = screen.getAllByRole('img')
    const priorityImages = images.filter((img) => img.getAttribute('data-priority') === 'true')
    // Only the sharp image of the first card should have priority
    expect(priorityImages).toHaveLength(1)
  })

  it('renders a category emoji placeholder when there is no image', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockMovieRec])
    render(await HomePage())

    expect(screen.getByText('🎬')).toBeInTheDocument()
  })

  it('renders tags truncated to 3 with an overflow badge', async () => {
    const recWithManyTags = {
      ...mockMovieRec,
      tags: ['Tag1', 'Tag2', 'Tag3', 'Tag4', 'Tag5'],
    }
    ;(getRecommendations as jest.Mock).mockResolvedValue([recWithManyTags])
    render(await HomePage())

    expect(screen.getByText('Tag1')).toBeInTheDocument()
    expect(screen.getByText('Tag2')).toBeInTheDocument()
    expect(screen.getByText('Tag3')).toBeInTheDocument()
    expect(screen.queryByText('Tag4')).not.toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('shows Anonymous when user has no name', async () => {
    const recAnon = { ...mockMovieRec, user: { name: null } }
    ;(getRecommendations as jest.Mock).mockResolvedValue([recAnon])
    render(await HomePage())

    expect(screen.getByText('by Anonymous')).toBeInTheDocument()
  })
})
