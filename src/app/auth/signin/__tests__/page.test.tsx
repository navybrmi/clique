import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
  signIn: jest.fn(),
}))

import SignInPage from "../page"

describe("SignInPage", () => {
  it("renders the Welcome to Clique heading", async () => {
    render(await SignInPage())
    expect(screen.getByText("Welcome to Clique")).toBeInTheDocument()
  })

  it("renders the Continue with Google button", async () => {
    render(await SignInPage())
    expect(screen.getByText("Continue with Google")).toBeInTheDocument()
  })

  it("does not render a Continue with Facebook button", async () => {
    render(await SignInPage())
    expect(screen.queryByText("Continue with Facebook")).not.toBeInTheDocument()
  })

  it("does not render any Facebook text", async () => {
    render(await SignInPage())
    expect(screen.queryByText(/facebook/i)).not.toBeInTheDocument()
  })

  it("renders the Back to home link", async () => {
    render(await SignInPage())
    expect(screen.getByRole("link", { name: /back to home/i })).toBeInTheDocument()
  })
})
