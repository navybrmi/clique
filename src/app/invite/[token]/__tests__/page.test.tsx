import React from "react"
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

jest.mock("next/link", () => {
  function MockLink({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) {
    return <a href={href} {...props}>{children}</a>
  }
  MockLink.displayName = "MockLink"
  return MockLink
})

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cliqueInvite: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/app/invite/[token]/accept-invite-button", () => ({
  AcceptInviteButton: ({ token }: { token: string }) => (
    <button data-testid="accept-btn" data-token={token}>
      Accept invite
    </button>
  ),
}))

import InvitePage from "@/app/invite/[token]/page"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const mockPrisma = prisma as unknown as {
  cliqueInvite: { findUnique: jest.Mock }
}
const mockAuth = auth as jest.Mock

const pendingInvite = {
  id: "inv-1",
  token: "tok123",
  cliqueId: "clique-1",
  status: "PENDING",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  clique: { name: "Weekend Crew" },
}

describe("InvitePage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows an invalid invite message when the token is not found", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue(null)

    render(await InvitePage({ params: Promise.resolve({ token: "bad-token" }) }))

    expect(screen.getByText("Invalid invite link")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /go home/i })).toHaveAttribute("href", "/")
  })

  it("shows the invite unavailable message for a REVOKED invite", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      status: "REVOKED",
    })

    render(await InvitePage({ params: Promise.resolve({ token: "tok123" }) }))

    expect(screen.getByText("Invite unavailable")).toBeInTheDocument()
    expect(
      screen.getByText("This invite has been revoked by the sender.")
    ).toBeInTheDocument()
  })

  it("shows the invite unavailable message for an ACCEPTED invite", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      status: "ACCEPTED",
    })

    render(await InvitePage({ params: Promise.resolve({ token: "tok123" }) }))

    expect(
      screen.getByText("This invite has already been accepted.")
    ).toBeInTheDocument()
  })

  it("shows the invite unavailable message for an expired invite", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      expiresAt: new Date(Date.now() - 1000),
    })

    render(await InvitePage({ params: Promise.resolve({ token: "tok123" }) }))

    expect(screen.getByText("This invite has expired.")).toBeInTheDocument()
  })

  it("shows the clique name and AcceptInviteButton for an authenticated user", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue(pendingInvite)
    mockAuth.mockResolvedValue({ user: { id: "user-1", name: "Bob" } })

    render(await InvitePage({ params: Promise.resolve({ token: "tok123" }) }))

    expect(screen.getByText("Weekend Crew")).toBeInTheDocument()
    const acceptBtn = screen.getByTestId("accept-btn")
    expect(acceptBtn).toBeInTheDocument()
    expect(acceptBtn).toHaveAttribute("data-token", "tok123")
  })

  it("shows a sign-in link for an unauthenticated user", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue(pendingInvite)
    mockAuth.mockResolvedValue(null)

    render(await InvitePage({ params: Promise.resolve({ token: "tok123" }) }))

    expect(screen.getByText("Weekend Crew")).toBeInTheDocument()
    expect(screen.queryByTestId("accept-btn")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /sign in to accept/i })).toHaveAttribute(
      "href",
      "/auth/signin?callbackUrl=/invite/tok123"
    )
  })
})
