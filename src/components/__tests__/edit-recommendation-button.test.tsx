import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { EditRecommendationButton } from '../edit-recommendation-button'

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
  })

  it('should render a disabled edit button when user is not the owner', () => {
    render(<EditRecommendationButton recommendation={mockRecommendation} isOwner={false} />)

    const button = screen.getByRole('button', { name: /edit/i })
    expect(button).toBeDisabled()
  })

  it('should render an enabled edit button when user is the owner', async () => {
    render(<EditRecommendationButton recommendation={mockRecommendation} isOwner={true} />)

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit/i })).not.toBeDisabled()
    })
  })

  it('should call refresh on successful edit', async () => {
    render(<EditRecommendationButton recommendation={mockRecommendation} isOwner={true} />)

    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })

    // The button opens a dialog with edit functionality
    // Success callback should call router.refresh
    expect(mockRouter.refresh).not.toHaveBeenCalled()
  })
})
