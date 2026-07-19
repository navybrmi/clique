import "@testing-library/jest-dom"
import React from "react"
import { render, screen } from "@testing-library/react"

const mockRedirect = jest.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`)
})

jest.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/profile",
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock("@/components/header", () => ({
  Header: function MockHeader({ pageTitle }: { pageTitle?: string }) {
    return <header data-testid="mock-header">{pageTitle}</header>
  },
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

const mockFindUnique = jest.fn()
const mockRecommendationCount = jest.fn()
const mockCliqueMemberCount = jest.fn()

jest.mock("@/lib/prisma", () => ({
  getPrismaClient: () => ({
    user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
    recommendation: { count: (...args: unknown[]) => mockRecommendationCount(...args) },
    cliqueMember: { count: (...args: unknown[]) => mockCliqueMemberCount(...args) },
  }),
}))

import ProfilePage from "../page"
import { auth } from "@/lib/auth"

const mockAuth = auth as jest.Mock

const user = {
  name: "Vijay Manchi",
  email: "vijay@example.com",
  image: "https://example.com/avatar.png",
  createdAt: new Date("2026-02-06T00:00:00Z"),
}

async function renderProfilePage() {
  const jsx = await ProfilePage()
  return render(jsx)
}

describe("ProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockFindUnique.mockResolvedValue(user)
    mockRecommendationCount.mockResolvedValue(12)
    mockCliqueMemberCount.mockResolvedValue(4)
  })

  it("redirects unauthenticated visitors to sign-in", async () => {
    mockAuth.mockResolvedValue(null)
    await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT:/auth/signin")
    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin")
  })

  it("redirects when the session user no longer exists", async () => {
    mockFindUnique.mockResolvedValue(null)
    await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT:/auth/signin")
  })

  it("renders the user's name and email", async () => {
    await renderProfilePage()
    expect(screen.getByText("Vijay Manchi")).toBeInTheDocument()
    expect(screen.getByText("vijay@example.com")).toBeInTheDocument()
  })

  it("renders the member-since date", async () => {
    await renderProfilePage()
    expect(screen.getByText(/member since february 2026/i)).toBeInTheDocument()
  })

  it("formats member-since in UTC so month boundaries don't shift with server timezone", async () => {
    // 00:30 UTC on March 1 is still February in any negative-offset zone;
    // UTC formatting must render March regardless of runtime timezone.
    mockFindUnique.mockResolvedValue({
      ...user,
      createdAt: new Date("2026-03-01T00:30:00Z"),
    })
    await renderProfilePage()
    expect(screen.getByText(/member since march 2026/i)).toBeInTheDocument()
  })

  it("renders recommendation and clique counts", async () => {
    await renderProfilePage()
    expect(screen.getByText("12")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("Recommendations")).toBeInTheDocument()
    expect(screen.getByText("Cliques")).toBeInTheDocument()
  })

  it("falls back to 'Anonymous' and email initial when name is missing", async () => {
    mockFindUnique.mockResolvedValue({ ...user, name: null, image: null })
    await renderProfilePage()
    expect(screen.getByText("Anonymous")).toBeInTheDocument()
    // Avatar fallback initial comes from the email
    expect(screen.getByText("v")).toBeInTheDocument()
  })

  it("scopes all queries to the signed-in user", async () => {
    await renderProfilePage()
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } })
    )
    expect(mockRecommendationCount).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(mockCliqueMemberCount).toHaveBeenCalledWith({ where: { userId: "user-1" } })
  })

  it("links to the My Recommendations feed", async () => {
    await renderProfilePage()
    expect(
      screen.getByRole("link", { name: /view my recommendations/i })
    ).toHaveAttribute("href", "/?mine=true")
  })
})
