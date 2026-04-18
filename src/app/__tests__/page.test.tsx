import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock next/link
jest.mock('next/link', () => {
  function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  }

  MockLink.displayName = 'MockLink'
  return MockLink
})

// Mock next/image
jest.mock('next/image', () => {
  function MockImage({
    src,
    alt,
    priority,
  }: {
    src: string
    alt: string
    priority?: boolean
  }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} data-priority={priority ? 'true' : undefined} />
  }

  MockImage.displayName = 'MockImage'
  return MockImage
})

// Mock Header to isolate page tests from session fetching
jest.mock('@/components/header', () => ({
  Header: function MockHeader() {
    return <header data-testid="mock-header" />
  },
}))

// Mock AddRecommendationTrigger to isolate page tests from dynamic imports
jest.mock('@/components/add-recommendation-trigger', () => ({
  AddRecommendationTrigger: function MockAddRecommendationTrigger() {
    return <div data-testid="mock-trigger" />
  },
}))

jest.mock('@/components/add-to-cliques-dialog', () => ({
  AddToCliquesDialog: function MockAddToCliquesDialog({
    recommendationId,
  }: {
    recommendationId: string
  }) {
    return <div data-testid="mock-add-to-clique">{recommendationId}</div>
  },
}))

jest.mock('@/components/clique-sidebar-wrapper', () => ({
  CliqueSidebarWrapper: function MockCliqueSidebarWrapper({
    activeCliqueId,
  }: {
    activeCliqueId?: string
  }) {
    return <aside data-testid="mock-clique-sidebar">{activeCliqueId ?? 'public'}</aside>
  },
}))

// Mock getRecommendations so tests don't hit the database
jest.mock('@/lib/recommendations', () => ({
  getRecommendations: jest.fn(),
}))

jest.mock('@/lib/clique-service', () => ({
  getCliqueFeed: jest.fn(),
}))

// Mock auth so tests don't pull in next-auth ESM module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    clique: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    cliqueRecommendation: {
      findMany: jest.fn(),
    },
    cliqueMember: {
      findMany: jest.fn(),
    },
    upVote: {
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
  getPrismaClient: jest.fn(),
}))

jest.mock('@/components/upvote-button', () => ({
  UpvoteButton: function MockUpvoteButton({
    initialCount,
    initialHasUpvoted,
  }: {
    recommendationId: string
    cliqueId: string
    initialCount: number
    initialHasUpvoted: boolean
  }) {
    return (
      <button aria-label={initialHasUpvoted ? 'Remove upvote' : 'Upvote'}>
        {initialCount}
      </button>
    )
  },
}))

import { getRecommendations } from '@/lib/recommendations'
import { getCliqueFeed } from '@/lib/clique-service'
import { auth } from '@/lib/auth'
import { prisma, getPrismaClient } from '@/lib/prisma'
import HomePage from '../page'

const mockAuth = auth as jest.Mock
const mockGetCliqueFeed = getCliqueFeed as jest.Mock
const mockFindFirstClique = prisma.clique.findFirst as jest.Mock
const mockFindUniqueClique = prisma.clique.findUnique as jest.Mock
const mockQueryRaw = prisma.$queryRaw as jest.Mock
const mockGetPrismaClient = getPrismaClient as jest.Mock

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

const mockCliqueFeedItem = {
  id: 'rec-clique-1',
  recommendationId: 'rec-clique-1',
  addedAt: new Date('2026-04-15T00:00:00Z'),
  submitterName: 'Clique Submitter',
  addedByName: 'Clique Submitter',
  recommendation: {
    id: 'rec-clique-1',
    tags: ['Shared pick'],
    link: null,
    imageUrl: null,
    rating: 9,
    createdAt: new Date('2026-04-15T00:00:00Z'),
    entity: {
      id: 'entity-1',
      name: 'Private Movie',
      category: { id: 'cat-1', name: 'MOVIE', displayName: 'Movie' },
      restaurant: null,
      movie: {
        director: 'Pat Director',
        year: 2026,
        genre: 'Drama',
        duration: '2h 3m',
      },
      fashion: null,
      household: null,
      other: null,
    },
    _count: { upvotes: 4, comments: 1 },
  },
}

async function renderHomePage(searchParams?: { cliqueId?: string | string[] }) {
  const jsx = await HomePage(
    searchParams ? { searchParams: Promise.resolve(searchParams) } : undefined
  )
  render(jsx)
}

describe('HomePage - Server Component', () => {
  beforeEach(() => {
    mockGetPrismaClient.mockReturnValue(prisma)
    mockAuth.mockResolvedValue(null)
    mockGetCliqueFeed.mockResolvedValue([])
    mockFindFirstClique.mockResolvedValue(null)
    mockFindUniqueClique.mockResolvedValue(null)
    mockQueryRaw.mockResolvedValue([])
    ;(prisma.upVote.findMany as jest.Mock).mockResolvedValue([])
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders recommendation cards with server-fetched data (no fetch call)', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockRestaurantRec, mockMovieRec])
    await renderHomePage()

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
    await renderHomePage()

    expect(screen.getByText(/Cuisine: Mediterranean/)).toBeInTheDocument()
    expect(screen.getByText(/145 S Frances St, Sunnyvale, CA/)).toBeInTheDocument()
    expect(screen.getByText(/Price: \$\$/)).toBeInTheDocument()
  })

  it('displays movie details on movie cards', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockMovieRec])
    await renderHomePage()

    expect(screen.getByText(/Director: Christopher Nolan/)).toBeInTheDocument()
    expect(screen.getByText(/Genre: Sci-Fi/)).toBeInTheDocument()
  })

  it('does not show restaurant fields on movie cards', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockMovieRec])
    await renderHomePage()

    expect(screen.queryByText(/Cuisine:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/145 S Frances St/)).not.toBeInTheDocument()
  })

  it('renders empty state when no recommendations exist', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([])
    await renderHomePage()

    expect(
      screen.getByText('No recommendations yet. Be the first to add one!')
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /SAJJ/i })).not.toBeInTheDocument()
  })

  it('spans empty feed content across both columns for authenticated users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    ;(getRecommendations as jest.Mock).mockResolvedValue([])

    await renderHomePage()

    expect(screen.getByTestId('feed-content-container')).toHaveClass('lg:col-span-2')
  })

  it('renders the AddRecommendationTrigger', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([])
    await renderHomePage()

    expect(screen.getByTestId('mock-trigger')).toBeInTheDocument()
  })

  it('does not render the top AddRecommendationTrigger for authenticated users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    ;(getRecommendations as jest.Mock).mockResolvedValue([])

    await renderHomePage()

    expect(screen.queryByTestId('mock-trigger')).not.toBeInTheDocument()
  })

  it('sets priority on the first card image and not subsequent ones', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([
      mockRecWithImage,
      { ...mockRecWithImage, id: 'rec-image-2', entity: { ...mockRecWithImage.entity, name: 'Second' } },
    ])
    await renderHomePage()

    const images = screen.getAllByRole('img')
    const priorityImages = images.filter((img) => img.getAttribute('data-priority') === 'true')
    // Only the sharp image of the first card should have priority
    expect(priorityImages).toHaveLength(1)
  })

  it('renders a category emoji placeholder when there is no image', async () => {
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockMovieRec])
    await renderHomePage()

    expect(screen.getByText('🎬')).toBeInTheDocument()
  })

  it('renders tags truncated to 3 with an overflow badge', async () => {
    const recWithManyTags = {
      ...mockMovieRec,
      tags: ['Tag1', 'Tag2', 'Tag3', 'Tag4', 'Tag5'],
    }
    ;(getRecommendations as jest.Mock).mockResolvedValue([recWithManyTags])
    await renderHomePage()

    expect(screen.getByText('Tag1')).toBeInTheDocument()
    expect(screen.getByText('Tag2')).toBeInTheDocument()
    expect(screen.getByText('Tag3')).toBeInTheDocument()
    expect(screen.queryByText('Tag4')).not.toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('shows Anonymous when user has no name and session is non-null', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const recAnon = { ...mockMovieRec, user: { name: null } }
    ;(getRecommendations as jest.Mock).mockResolvedValue([recAnon])
    await renderHomePage()

    expect(screen.getByText('by Anonymous')).toBeInTheDocument()
    expect(screen.getByTestId('mock-clique-sidebar')).toBeInTheDocument()
  })

  it('renders the clique sidebar for authenticated users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockMovieRec])

    await renderHomePage()

    expect(screen.getByTestId('mock-clique-sidebar')).toHaveTextContent('public')
  })

  it('renders add-to-clique actions for authenticated users on the public feed', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockMovieRec, mockRestaurantRec])

    await renderHomePage()

    expect(screen.getAllByTestId('mock-add-to-clique')).toHaveLength(2)
  })

  it('renders a clique feed and preserves cliqueId in recommendation links', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindFirstClique.mockResolvedValue({ id: 'clique-1', name: 'Weekend Crew' })
    mockGetCliqueFeed.mockResolvedValue([mockCliqueFeedItem])

    await renderHomePage({ cliqueId: 'clique-1' })

    expect(mockGetCliqueFeed).toHaveBeenCalledWith('clique-1', 'user-1')
    expect(screen.getByText('Submitted by Clique Submitter')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Private Movie/i })).toHaveAttribute(
      'href',
      '/recommendations/rec-clique-1?cliqueId=clique-1'
    )
    expect(screen.getByTestId('mock-clique-sidebar')).toHaveTextContent('clique-1')
    expect(screen.queryByTestId('mock-add-to-clique')).not.toBeInTheDocument()
  })

  it('shows an explicit access error state for an inaccessible cliqueId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindFirstClique.mockResolvedValue(null)
    mockFindUniqueClique.mockResolvedValue({ name: 'Secret Squad' })

    await renderHomePage({ cliqueId: 'clique-9' })

    expect(screen.getByText('Unable to open this clique feed')).toBeInTheDocument()
    expect(screen.getByText('You do not have access to this clique feed.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Public Feed' })).toHaveAttribute(
      'href',
      '/'
    )
    expect(getRecommendations).not.toHaveBeenCalled()
  })

  it('shows a generic clique feed error in production while logging remediation steps server-side', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    process.env.NODE_ENV = 'production'
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindFirstClique.mockResolvedValue({ id: 'clique-1', name: 'Weekend Crew' })
    mockGetPrismaClient.mockReturnValue({
      clique: {
        findFirst: mockFindFirstClique,
        findUnique: mockFindUniqueClique,
      },
      cliqueRecommendation: {},
      cliqueMember: {},
      $queryRaw: mockQueryRaw,
    })

    try {
      await renderHomePage({ cliqueId: 'clique-1' })

      expect(screen.getByText('Unable to open this clique feed')).toBeInTheDocument()
      expect(
        screen.getByText('Clique feed is temporarily unavailable. Please try again shortly.')
      ).toBeInTheDocument()
      expect(screen.queryByText(/npx prisma generate/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/restart the dev server/i)).not.toBeInTheDocument()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('npx prisma generate')
      )
    } finally {
      process.env.NODE_ENV = originalNodeEnv
      consoleErrorSpy.mockRestore()
    }
  })

  it('keeps development guidance generic by sending users to server logs', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    process.env.NODE_ENV = 'development'
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockFindFirstClique.mockResolvedValue({ id: 'clique-1', name: 'Weekend Crew' })
    mockGetPrismaClient.mockReturnValue({
      clique: {
        findFirst: mockFindFirstClique,
        findUnique: mockFindUniqueClique,
      },
      cliqueRecommendation: {},
      cliqueMember: {},
      $queryRaw: mockQueryRaw,
    })

    try {
      await renderHomePage({ cliqueId: 'clique-1' })

      expect(
        screen.getByText(
          'Clique feed is temporarily unavailable in development. Check the server logs for more details.'
        )
      ).toBeInTheDocument()
      expect(screen.queryByText(/npx prisma generate/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/restart the dev server/i)).not.toBeInTheDocument()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('restart the dev server')
      )
    } finally {
      process.env.NODE_ENV = originalNodeEnv
      consoleErrorSpy.mockRestore()
    }
  })
})

describe('HomePage - submitter name auth gating', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('shows "by [name]" on cards when session is non-null', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockMovieRec])
    await renderHomePage()

    expect(screen.getByText('by Test User')).toBeInTheDocument()
  })

  it('does not show "by [name]" on cards when session is null', async () => {
    mockAuth.mockResolvedValue(null)
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockMovieRec])
    await renderHomePage()

    expect(screen.queryByText(/by Test User/)).not.toBeInTheDocument()
  })

  it('does not show "by Anonymous" on cards when session is null', async () => {
    mockAuth.mockResolvedValue(null)
    const recAnon = { ...mockMovieRec, user: { name: null } }
    ;(getRecommendations as jest.Mock).mockResolvedValue([recAnon])
    await renderHomePage()

    expect(screen.queryByText(/by Anonymous/)).not.toBeInTheDocument()
  })

  it('does not render the clique sidebar when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    ;(getRecommendations as jest.Mock).mockResolvedValue([mockMovieRec])

    await renderHomePage()

    expect(screen.queryByTestId('mock-clique-sidebar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-add-to-clique')).not.toBeInTheDocument()
  })
})
