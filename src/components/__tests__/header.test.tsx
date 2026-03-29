import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Header } from '../header'

// Mock UserMenu to provide a testable interface
jest.mock('../user-menu', () => ({
  UserMenu: ({ user, onSignOut }: any) => {
    return (
      <button data-testid="mock-user-menu" onClick={onSignOut}>
        {user.name}
      </button>
    )
  },
}))

// Mock signOut
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}))

import { signOut } from 'next-auth/react'

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the header with logo', () => {
    render(<Header />)
    expect(screen.getByText('Clique')).toBeInTheDocument()
  })

  it('should render back button when showBack is true', () => {
    render(<Header showBack={true} />)
    const backLinks = screen.getAllByRole('link', { name: /back/i })
    expect(backLinks.length).toBeGreaterThan(0)
  })

  it('should not render back button when showBack is false', () => {
    render(<Header showBack={false} />)
    const backLinks = screen.queryAllByRole('link', { name: /back/i })
    expect(backLinks.length).toBe(0)
  })

  it('should show sign in buttons when no session provided', () => {
    render(<Header />)
    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('should show sign in buttons when session is null', () => {
    render(<Header session={null} />)
    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('should show user menu when authenticated session is provided', () => {
    const mockSession = {
      user: {
        id: 'user-123',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      },
    }

    render(<Header session={mockSession} />)
    expect(screen.getByTestId('mock-user-menu')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('should show sign in buttons when session has no user', () => {
    render(<Header session={{}} />)
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('should call signOut with correct callback when handleSignOut is invoked', async () => {
    const mockSession = {
      user: {
        id: 'user-123',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      },
    }

    const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
    mockSignOut.mockResolvedValue(undefined as any)

    render(<Header session={mockSession} />)

    expect(screen.getByTestId('mock-user-menu')).toBeInTheDocument()

    const userMenuButton = screen.getByTestId('mock-user-menu')
    fireEvent.click(userMenuButton)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' })
    })
  })
})
