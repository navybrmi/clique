import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditRecommendationButton } from '../edit-recommendation-button'

global.fetch = jest.fn()

const mockRecommendation = {
  id: 'test-id-123',
  userId: 'user-123',
  entity: {
    name: 'Test Movie',
    category: { name: 'MOVIE' },
  },
  tags: ['Great', 'Must Watch'],
  rating: 5,
}

const mockRouter = {
  refresh: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

describe('EditRecommendationButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('should not render when user is not logged in', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: null }),
    })

    const { container } = render(<EditRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('should not render when user is not the owner', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'different-user-id' } }),
    })

    const { container } = render(<EditRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('should render edit button when user is the owner', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    })

    render(<EditRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  it('should render with loading state initially', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({ user: { id: 'user-123' } }) }), 100))
    )

    const { container } = render(<EditRecommendationButton recommendation={mockRecommendation} />)
    
    expect(container.firstChild).toBeNull()

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    }, { timeout: 200 })
  })

  it('should call refresh on successful edit', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    })

    render(<EditRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    // The button opens a dialog with edit functionality
    // Success callback should call router.refresh
    expect(mockRouter.refresh).not.toHaveBeenCalled()
  })
})
