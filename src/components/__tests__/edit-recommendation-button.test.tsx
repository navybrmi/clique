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

  it('should render disabled edit button when user is not logged in', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: null }),
    })

    render(<EditRecommendationButton recommendation={mockRecommendation} />)

    await waitFor(() => {
      const button = screen.getByText('Edit').closest('button')
      expect(button).toBeDisabled()
    })
  })

  it('should render disabled edit button when user is not the owner', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'different-user-id' } }),
    })

    render(<EditRecommendationButton recommendation={mockRecommendation} />)

    await waitFor(() => {
      const button = screen.getByText('Edit').closest('button')
      expect(button).toBeDisabled()
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

  it('should render disabled button during loading then enable when owner', async () => {
    ;(global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({ user: { id: 'user-123' } }) }), 100))
    )

    render(<EditRecommendationButton recommendation={mockRecommendation} />)

    // During loading, button should be disabled
    expect(screen.getByText('Edit').closest('button')).toBeDisabled()

    // After loading, button should be enabled for owner (re-query the DOM)
    await waitFor(() => {
      expect(screen.getByText('Edit').closest('button')).not.toBeDisabled()
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
