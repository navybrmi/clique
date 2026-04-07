/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('@/lib/auth', () => ({
  signIn: jest.fn(),
  auth: jest.fn().mockResolvedValue(null),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// next/link renders as a plain anchor in tests
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import SignInPage from '../page'

async function renderSignInPage(error?: string) {
  const searchParams = Promise.resolve(error ? { error } : {})
  const jsx = await SignInPage({ searchParams })
  render(jsx as React.ReactElement)
}

describe('SignInPage', () => {
  it('renders sign-in buttons', async () => {
    await renderSignInPage()
    expect(screen.getByText('Continue with Facebook')).toBeInTheDocument()
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
  })

  it('shows no error banner when there is no error param', async () => {
    await renderSignInPage()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.queryByText(/already associated/i)).not.toBeInTheDocument()
  })

  it('shows a friendly message for OAuthAccountNotLinked error', async () => {
    await renderSignInPage('OAuthAccountNotLinked')
    expect(
      screen.getByText(/already associated with another sign-in method/i)
    ).toBeInTheDocument()
  })

  it('shows a friendly message for OAuthSignin error', async () => {
    await renderSignInPage('OAuthSignin')
    expect(
      screen.getByText(/could not start the sign-in flow/i)
    ).toBeInTheDocument()
  })

  it('shows a friendly message for OAuthCallback error', async () => {
    await renderSignInPage('OAuthCallback')
    expect(
      screen.getByText(/something went wrong during sign-in/i)
    ).toBeInTheDocument()
  })

  it('shows a generic message for an unknown error code', async () => {
    await renderSignInPage('SomeUnknownError')
    expect(
      screen.getByText(/an unexpected error occurred/i)
    ).toBeInTheDocument()
  })
})
