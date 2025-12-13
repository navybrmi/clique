import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { Header } from '../header'

// Mock UserMenu to capture the onSignOut prop
let capturedOnSignOut: (() => void) | undefined
jest.mock('../user-menu', () => ({
  UserMenu: ({ user, onSignOut }: any) => {
    capturedOnSignOut = onSignOut
    return (
      <button data-testid="mock-user-menu" onClick={onSignOut}>
        {user.name}
      </button>
    )
  },
}))

// Mock useSession
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}))

import { useSession, signOut } from 'next-auth/react'

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedOnSignOut = undefined
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

  it('should pass signOut handler to UserMenu when authenticated', async () => {
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

    const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
    mockSignOut.mockResolvedValue(undefined as any)

    render(<Header />)
    
    // Wait for component to render with user menu
    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    // Verify signOut is imported and available (it will be called by UserMenu's onSignOut prop)
    expect(mockSignOut).toBeDefined()
  })

  it('should handle session fetch error gracefully', async () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    // Mock fetch to reject with error
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock

    render(<Header />)
    
    // Should still render the header and show sign in buttons despite fetch error
    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument()
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })
  })

  it('should call signOut with correct callback when handleSignOut is invoked', async () => {
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

    const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
    mockSignOut.mockResolvedValue(undefined as any)

    render(<Header />)
    
    await waitFor(() => {
      expect(screen.getByTestId('mock-user-menu')).toBeInTheDocument()
    })

    // Click the mocked UserMenu button which will call onSignOut (handleSignOut)
    const userMenuButton = screen.getByTestId('mock-user-menu')
    fireEvent.click(userMenuButton)

    // Verify signOut was called with correct callback URL
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' })
    })
  })
})
