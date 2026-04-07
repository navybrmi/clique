import React from 'react'
import { render, screen } from '@testing-library/react'
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

  it('should render disabled edit button when no currentUserId provided', () => {
    render(<EditRecommendationButton recommendation={mockRecommendation} />)
    const button = screen.getByText('Edit').closest('button')
    expect(button).toBeDisabled()
  })

  it('should render disabled edit button when currentUserId is null', () => {
    render(<EditRecommendationButton recommendation={mockRecommendation} currentUserId={null} />)
    const button = screen.getByText('Edit').closest('button')
    expect(button).toBeDisabled()
  })

  it('should render disabled edit button when user is not the owner', () => {
    render(<EditRecommendationButton recommendation={mockRecommendation} currentUserId="different-user-id" />)
    const button = screen.getByText('Edit').closest('button')
    expect(button).toBeDisabled()
  })

  it('should render enabled edit button when user is the owner', () => {
    render(<EditRecommendationButton recommendation={mockRecommendation} currentUserId="user-123" />)
    expect(screen.getByText('Edit')).toBeInTheDocument()
    const button = screen.getByText('Edit').closest('button')
    expect(button).not.toBeDisabled()
  })

  it('should not call refresh before any interaction', () => {
    render(<EditRecommendationButton recommendation={mockRecommendation} currentUserId="user-123" />)
    expect(mockRouter.refresh).not.toHaveBeenCalled()
  })
})
