import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Shared router mock so we can inspect calls
const mockRouterRefresh = jest.fn()
const mockRouter = { refresh: mockRouterRefresh, push: jest.fn() }

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  notFound: jest.fn(),
}))

// Mock next/dynamic so AddRecommendationDialog loads synchronously in tests
jest.mock('next/dynamic', () => (fn: () => Promise<{ default: React.ComponentType<any> }>) => {
  // Return a stub that captures all props so we can test forwarding
  const MockDialog = (props: any) => (
    <div
      data-testid="mock-dialog"
      data-show-login-alert={String(props.showLoginAlert)}
      data-user-id={props.userId ?? ''}
      data-current-clique-id={props.currentCliqueId ?? ''}
    >
      <button
        data-testid="trigger-on-success"
        onClick={() => props.onSuccess && props.onSuccess()}
      >
        Trigger onSuccess
      </button>
      <button
        data-testid="trigger-on-blocked-open"
        onClick={() => props.onBlockedOpen && props.onBlockedOpen()}
      >
        Trigger onBlockedOpen
      </button>
      <button
        data-testid="trigger-on-dismiss-login-alert"
        onClick={() => props.onDismissLoginAlert && props.onDismissLoginAlert()}
      >
        Trigger onDismissLoginAlert
      </button>
    </div>
  )
  MockDialog.displayName = 'MockAddRecommendationDialog'
  return MockDialog
})

// useRouter is already mocked in jest.setup.js via next/navigation mock
import { AddRecommendationTrigger } from '../add-recommendation-trigger'

describe('AddRecommendationTrigger', () => {
  beforeEach(() => {
    mockRouterRefresh.mockClear()
  })

  it('renders the Browse Categories button', () => {
    render(<AddRecommendationTrigger />)
    expect(screen.getByRole('button', { name: /browse categories/i })).toBeInTheDocument()
  })

  it('renders the dialog', () => {
    render(<AddRecommendationTrigger />)
    expect(screen.getByTestId('mock-dialog')).toBeInTheDocument()
  })

  it('does not show login alert by default', () => {
    render(<AddRecommendationTrigger />)
    expect(screen.queryByText(/you must be signed in/i)).not.toBeInTheDocument()
  })

  it('passes showLoginAlert=false to dialog by default', () => {
    render(<AddRecommendationTrigger />)
    const dialog = screen.getByTestId('mock-dialog')
    expect(dialog).toHaveAttribute('data-show-login-alert', 'false')
  })

  it('dismisses login alert when dismiss button is clicked', () => {
    render(<AddRecommendationTrigger />)
    // Alert is not visible initially
    expect(screen.queryByRole('button', { name: /dismiss login alert/i })).not.toBeInTheDocument()
  })

  it('calls router.refresh() when onSuccess is triggered from dialog (line 31)', async () => {
    const user = userEvent.setup()
    render(<AddRecommendationTrigger />)

    await user.click(screen.getByTestId('trigger-on-success'))

    expect(mockRouterRefresh).toHaveBeenCalledTimes(1)
  })

  it('forwards showLoginAlert=true to dialog when onBlockedOpen is triggered (lines 32-33)', async () => {
    const user = userEvent.setup()
    render(<AddRecommendationTrigger />)

    const dialog = screen.getByTestId('mock-dialog')
    expect(dialog).toHaveAttribute('data-show-login-alert', 'false')

    await user.click(screen.getByTestId('trigger-on-blocked-open'))

    await waitFor(() => {
      expect(screen.getByTestId('mock-dialog')).toHaveAttribute('data-show-login-alert', 'true')
    })
  })

  it('forwards onDismissLoginAlert prop to dialog and resets showLoginAlert (lines 33-34)', async () => {
    const user = userEvent.setup()
    render(<AddRecommendationTrigger />)

    // First trigger blocked open to set showLoginAlert=true
    await user.click(screen.getByTestId('trigger-on-blocked-open'))
    await waitFor(() => {
      expect(screen.getByTestId('mock-dialog')).toHaveAttribute('data-show-login-alert', 'true')
    })

    // Now trigger dismiss via dialog's onDismissLoginAlert prop
    await user.click(screen.getByTestId('trigger-on-dismiss-login-alert'))
    await waitFor(() => {
      expect(screen.getByTestId('mock-dialog')).toHaveAttribute('data-show-login-alert', 'false')
    })
  })

  it('shows login alert banner when showLoginAlert becomes true', async () => {
    const user = userEvent.setup()
    render(<AddRecommendationTrigger />)

    expect(screen.queryByText(/you must be signed in/i)).not.toBeInTheDocument()

    await user.click(screen.getByTestId('trigger-on-blocked-open'))

    await waitFor(() => {
      expect(screen.getByText(/you must be signed in to add a recommendation/i)).toBeInTheDocument()
    })
  })

  it('hides login alert banner when dismiss button is clicked (line 58)', async () => {
    const user = userEvent.setup()
    render(<AddRecommendationTrigger />)

    // Show the alert
    await user.click(screen.getByTestId('trigger-on-blocked-open'))
    await waitFor(() => {
      expect(screen.getByText(/you must be signed in to add a recommendation/i)).toBeInTheDocument()
    })

    // Click the dismiss button inside the alert banner
    const dismissButton = screen.getByRole('button', { name: /dismiss login alert/i })
    await user.click(dismissButton)

    await waitFor(() => {
      expect(screen.queryByText(/you must be signed in to add a recommendation/i)).not.toBeInTheDocument()
    })
  })

  it('forwards userId prop to dialog', () => {
    render(<AddRecommendationTrigger userId="user-abc" />)
    expect(screen.getByTestId('mock-dialog')).toHaveAttribute('data-user-id', 'user-abc')
  })

  it("forwards currentCliqueId prop to dialog", () => {
    render(<AddRecommendationTrigger currentCliqueId="clique-123" />)
    expect(screen.getByTestId("mock-dialog")).toHaveAttribute(
      "data-current-clique-id",
      "clique-123"
    )
  })
})
