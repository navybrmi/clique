import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteRecommendationButton } from '../delete-recommendation-button'

const mockRecommendation = {
  id: 'test-id-123',
  userId: 'user-123',
  entity: {
    name: 'Test Recommendation',
  },
}

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

describe('DeleteRecommendationButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset fetch mock
    global.fetch = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as jest.Mock
  })

  it('should not render when user is not logged in', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ user: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as jest.Mock

    const { container } = render(<DeleteRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('should not render when user is not the owner', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ user: { id: 'different-user-id' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as jest.Mock

    const { container } = render(<DeleteRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('should render delete button when user is the owner', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ user: { id: 'user-123' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as jest.Mock

    render(<DeleteRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  it('should show confirmation dialog when delete button is clicked', async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ user: { id: 'user-123' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as jest.Mock

    render(<DeleteRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(screen.getByText('Delete Recommendation')).toBeInTheDocument()
      expect(screen.getByText(/Test Recommendation/)).toBeInTheDocument()
    })
  })

  it('should call delete API and redirect on confirmation', async () => {
    const user = userEvent.setup()
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: 'user-123' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Deleted' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    
    global.fetch = fetchMock as any

    render(<DeleteRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(screen.getByText('Delete Recommendation')).toBeInTheDocument()
    })

    // Wait for dialog to open, then find all buttons and click the destructive one
    await waitFor(async () => {
      const allButtons = screen.getAllByRole('button')
      const confirmButton = allButtons.find(button => 
        button.textContent?.includes('Delete') && 
        button.className.includes('destructive') &&
        !button.hasAttribute('aria-haspopup')
      )
      
      if (confirmButton) {
        await user.click(confirmButton)
      }
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/recommendations/${mockRecommendation.id}`,
        { method: 'DELETE' }
      )
      expect(mockRouter.push).toHaveBeenCalledWith('/')
      expect(mockRouter.refresh).toHaveBeenCalled()
    })
  })

  it('should show error message when deletion fails', async () => {
    const user = userEvent.setup()
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {})
    
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: 'user-123' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Delete failed' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    
    global.fetch = fetchMock as any

    render(<DeleteRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })


    // Open the dialog
    await user.click(screen.getByText('Delete'))

    // Wait for the destructive Delete button to be enabled
    const destructiveButton = await waitFor(() => {
      const btns = screen.getAllByRole('button', { name: /delete/i })
      return btns.find(
        btn => btn.className.includes('destructive') && !btn.disabled && getComputedStyle(btn).pointerEvents !== 'none'
      )
    })

    await user.click(destructiveButton)

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Delete failed')
    })

    mockAlert.mockRestore()
  })

  it('should handle network errors gracefully', async () => {
    const user = userEvent.setup()
    const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {})
    
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: 'user-123' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockRejectedValueOnce(new Error('Network error'))
    
    global.fetch = fetchMock as any

    render(<DeleteRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(screen.getByText('Delete Recommendation')).toBeInTheDocument()
    })


    // Wait for the destructive Delete button to be enabled
    const destructiveButton = await waitFor(() => {
      const btns = screen.getAllByRole('button', { name: /delete/i })
      return btns.find(
        btn => btn.className.includes('destructive') && !btn.disabled && getComputedStyle(btn).pointerEvents !== 'none'
      )
    })

    await user.click(destructiveButton)

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Failed to delete recommendation')
    })

    mockAlert.mockRestore()
  })

  it('should close dialog when cancel is clicked', async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ user: { id: 'user-123' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as jest.Mock

    render(<DeleteRecommendationButton recommendation={mockRecommendation} />)
    
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Cancel'))

    await waitFor(() => {
      expect(screen.queryByText('Delete Recommendation')).not.toBeInTheDocument()
    })
  })
})
