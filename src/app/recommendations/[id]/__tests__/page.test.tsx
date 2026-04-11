import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

// Mock next/navigation
jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => { throw new Error("NEXT_NOT_FOUND") }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/",
}))

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    recommendation: {
      findUnique: jest.fn(),
    },
  },
}))

// Mock auth so tests don't pull in next-auth ESM module
jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
}))

// Mock client-only sub-components to avoid "use client" boundary issues in jsdom
jest.mock("@/components/comments-section", () => ({
  CommentsSection: () => <div data-testid="comments-section" />,
}))

jest.mock("@/components/actions-sidebar", () => ({
  ActionsSidebar: () => <div data-testid="actions-sidebar" />,
}))

jest.mock("@/components/edit-recommendation-button", () => ({
  EditRecommendationButton: () => <button>Edit</button>,
}))

jest.mock("@/components/delete-recommendation-button", () => ({
  DeleteRecommendationButton: () => <button>Delete</button>,
}))

jest.mock("@/components/refresh-entity-button", () => ({
  RefreshEntityButton: () => <button>Refresh</button>,
}))

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import RecommendationDetailPage from "../page"

const mockAuth = auth as jest.Mock
const mockPrisma = prisma as jest.Mocked<typeof prisma>

const baseRecommendation = {
  id: "rec-1",
  rating: 8,
  imageUrl: null,
  link: null,
  tags: ["Affordable prices", "Fresh ingredients"],
  createdAt: new Date("2026-01-05T00:00:00.000Z"),
  user: { id: "user-1", name: "Test User", image: null },
  entity: {
    name: "YGF Malatang",
    category: { displayName: "Restaurant" },
    restaurant: {
      cuisine: "Chinese",
      location: "19672 Stevens Creek Blvd, Cupertino, CA 95014, USA",
      priceRange: "$$",
      hours: "Monday: 11:30 AM - 9:00 PM",
      phoneNumber: "(408) 352-5101",
    },
    movie: null,
    fashion: null,
    household: null,
    other: null,
  },
  comments: [],
  _count: { upvotes: 0, comments: 0 },
}

async function renderPage(recommendation: any) {
  ;(mockPrisma.recommendation.findUnique as jest.Mock).mockResolvedValue(recommendation)
  const PageComponent = await RecommendationDetailPage({ params: Promise.resolve({ id: "rec-1" }) })
  render(PageComponent as React.ReactElement)
}

describe("RecommendationDetailPage — layout order", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("renders the category badge", async () => {
    await renderPage(baseRecommendation)
    expect(screen.getByText("Restaurant")).toBeInTheDocument()
  })

  it("renders the star rating", async () => {
    await renderPage(baseRecommendation)
    expect(screen.getByText("8/10")).toBeInTheDocument()
  })

  it('renders "Why This Recommendation?" heading', async () => {
    await renderPage(baseRecommendation)
    expect(screen.getByText("Why This Recommendation?")).toBeInTheDocument()
  })

  it("renders category badge before the Restaurant Details card", async () => {
    await renderPage(baseRecommendation)
    const badge = screen.getByText("Restaurant")
    const detailHeading = screen.getByText("Restaurant Details")
    expect(
      badge.compareDocumentPosition(detailHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('renders "Why This Recommendation?" before the Restaurant Details card', async () => {
    await renderPage(baseRecommendation)
    const tagsHeading = screen.getByText("Why This Recommendation?")
    const detailHeading = screen.getByText("Restaurant Details")
    expect(
      tagsHeading.compareDocumentPosition(detailHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("renders tag badges when tags are present", async () => {
    await renderPage(baseRecommendation)
    expect(screen.getByText("Affordable prices")).toBeInTheDocument()
    expect(screen.getByText("Fresh ingredients")).toBeInTheDocument()
  })

  it('renders "No tags added" placeholder when tags array is empty', async () => {
    await renderPage({ ...baseRecommendation, tags: [] })
    expect(screen.getByText("No tags added")).toBeInTheDocument()
  })

  it('renders "No tags added" placeholder when tags is null', async () => {
    await renderPage({ ...baseRecommendation, tags: null })
    expect(screen.getByText("No tags added")).toBeInTheDocument()
  })

  it('renders "No tags added" placeholder when tags is undefined', async () => {
    await renderPage({ ...baseRecommendation, tags: undefined } as any)
    expect(screen.getByText("No tags added")).toBeInTheDocument()
  })

  it("still renders restaurant detail fields", async () => {
    await renderPage(baseRecommendation)
    expect(screen.getByText("19672 Stevens Creek Blvd, Cupertino, CA 95014, USA")).toBeInTheDocument()
    expect(screen.getByText("(408) 352-5101")).toBeInTheDocument()
    expect(screen.getByText("$$")).toBeInTheDocument()
  })

  it("calls notFound when recommendation does not exist", async () => {
    ;(mockPrisma.recommendation.findUnique as jest.Mock).mockResolvedValue(null)
    const { notFound } = await import("next/navigation")
    await expect(
      RecommendationDetailPage({ params: Promise.resolve({ id: "missing" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND")
    expect(notFound).toHaveBeenCalled()
  })
})

describe("RecommendationDetailPage — submitter display", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("shows submitter name when session is non-null", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    await renderPage(baseRecommendation)
    expect(screen.getByText(/Recommended by Test User/)).toBeInTheDocument()
  })

  it("shows formatted submission date when session is non-null", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    await renderPage(baseRecommendation)
    const expectedDate = new Date(baseRecommendation.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    expect(screen.getByText(new RegExp(expectedDate))).toBeInTheDocument()
  })

  it("does not show submitter line when session is null", async () => {
    mockAuth.mockResolvedValue(null)
    await renderPage(baseRecommendation)
    expect(screen.queryByText(/Recommended by/)).not.toBeInTheDocument()
  })

  it("shows 'Recommended by Anonymous' when user name is null and session is non-null", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    await renderPage({ ...baseRecommendation, user: { id: "user-1", name: null, image: null } })
    expect(screen.getByText(/Recommended by Anonymous/)).toBeInTheDocument()
  })

  it("submitter line appears after the entity h1 in DOM order (right side of flex row)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    await renderPage(baseRecommendation)
    const submitterText = screen.getByText(/Recommended by Test User/)
    const heading = screen.getByRole("heading", { name: /YGF Malatang/ })
    expect(
      heading.compareDocumentPosition(submitterText) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
