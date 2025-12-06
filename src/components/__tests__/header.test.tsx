import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { Header } from '../header'

// Mock useSession
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

import { useSession } from 'next-auth/react'

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock fetch to return empty session
    global.fetch = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ user: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as jest.Mock
  })

  it('should render the header with logo', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(<Header />)
    
    await waitFor(() => {
      expect(screen.getByText('Clique')).toBeInTheDocument()
    })
  })

  it('should render back button when showBack is true', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(<Header showBack={true} />)
    
    await waitFor(() => {
      const backLinks = screen.getAllByRole('link', { name: /back/i })
      expect(backLinks.length).toBeGreaterThan(0)
    })
  })

  it('should not render back button when showBack is false', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(<Header showBack={false} />)
    
    await waitFor(() => {
      const backLinks = screen.queryAllByRole('link', { name: /back/i })
      expect(backLinks.length).toBe(0)
    })
  })

  it('should show skeleton when loading', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading',
    })

    const { container } = render(<Header />)
    
    await waitFor(() => {
      const skeleton = container.querySelector('.animate-pulse')
      expect(skeleton).toBeInTheDocument()
    })
  })

  it('should show user menu when authenticated', async () => {
    const mockUser = {
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.jpg',
    }

    ;(useSession as jest.Mock).mockReturnValue({
      data: {
        user: mockUser,
      },
      status: 'authenticated',
    })

    global.fetch = jest.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ user: mockUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ) as jest.Mock

    render(<Header />)
    
    await waitFor(() => {
      // Check for user menu button presence
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  it('should show sign in button when not authenticated', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(<Header />)
    
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })
  })
})
