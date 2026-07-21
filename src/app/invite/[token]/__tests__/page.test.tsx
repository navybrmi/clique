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
    cliqueMember: {
      findUnique: jest.fn(),
    },
  },
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/app/invite/[token]/accept-invite-button", () => ({
  AcceptInviteButton: ({ token, isLinkInvite }: { token: string; isLinkInvite: boolean }) => (
    <button data-testid="accept-btn" data-token={token} data-is-link-invite={String(isLinkInvite)}>
      {isLinkInvite ? "Request to join" : "Accept invite"}
    </button>
  ),
}))

import InvitePage from "@/app/invite/[token]/page"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const mockPrisma = prisma as unknown as {
  cliqueInvite: { findUnique: jest.Mock }
  cliqueMember: { findUnique: jest.Mock }
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
    // Default to "not a member" — jest.clearAllMocks() clears call history but not
    // previously configured resolved values, so this must be set explicitly each run;
    // individual tests override it when simulating an existing membership.
    mockPrisma.cliqueMember.findUnique.mockResolvedValue(null)
    mockAuth.mockResolvedValue(null)
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

  it("passes isLinkInvite=false for a user-type invite (email set)", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      email: "bob@example.com",
    })
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })

    render(await InvitePage({ params: Promise.resolve({ token: "tok123" }) }))

    expect(screen.getByTestId("accept-btn")).toHaveAttribute("data-is-link-invite", "false")
    expect(screen.getByText("Accept invite")).toBeInTheDocument()
    expect(screen.getByText(/accept to start seeing/i)).toBeInTheDocument()
  })

  it("passes isLinkInvite=true and shows request description for a link-type invite (email null)", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      email: null,
    })
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })

    render(await InvitePage({ params: Promise.resolve({ token: "tok123" }) }))

    expect(screen.getByTestId("accept-btn")).toHaveAttribute("data-is-link-invite", "true")
    expect(screen.getByText("Request to join")).toBeInTheDocument()
    expect(screen.getByText(/request access/i)).toBeInTheDocument()
  })

  it("shows a 'Go to clique' link when the user already belongs to the clique behind a link invite", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      email: null,
    })
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockPrisma.cliqueMember.findUnique.mockResolvedValue({ cliqueId: "clique-1" })

    render(await InvitePage({ params: Promise.resolve({ token: "tok123" }) }))

    expect(screen.getByText(/you.re already a member of weekend crew/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /go to clique/i })).toHaveAttribute(
      "href",
      "/?cliqueId=clique-1"
    )
    expect(screen.queryByTestId("accept-btn")).not.toBeInTheDocument()
  })

  it("shows a 'Go to clique' link instead of 'Invite unavailable' when the user already accepted a single-use invite", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      status: "ACCEPTED",
      email: "bob@example.com",
    })
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockPrisma.cliqueMember.findUnique.mockResolvedValue({ cliqueId: "clique-1" })

    render(await InvitePage({ params: Promise.resolve({ token: "tok123" }) }))

    expect(screen.getByText(/you.re already a member of weekend crew/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /go to clique/i })).toHaveAttribute(
      "href",
      "/?cliqueId=clique-1"
    )
    expect(screen.queryByText("Invite unavailable")).not.toBeInTheDocument()
  })

  it("shows a 'Go to clique' link instead of 'Invite unavailable' when the user already belongs to the clique behind a REVOKED invite", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      status: "REVOKED",
    })
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockPrisma.cliqueMember.findUnique.mockResolvedValue({ cliqueId: "clique-1" })

    render(await InvitePage({ params: Promise.resolve({ token: "tok123" }) }))

    expect(screen.getByText(/you.re already a member of weekend crew/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /go to clique/i })).toHaveAttribute(
      "href",
      "/?cliqueId=clique-1"
    )
    expect(screen.queryByText("Invite unavailable")).not.toBeInTheDocument()
  })

  it("shows a 'Go to clique' link instead of 'Invite unavailable' when the user already belongs to the clique behind an expired invite", async () => {
    mockPrisma.cliqueInvite.findUnique.mockResolvedValue({
      ...pendingInvite,
      expiresAt: new Date(Date.now() - 1000),
    })
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockPrisma.cliqueMember.findUnique.mockResolvedValue({ cliqueId: "clique-1" })

    render(await InvitePage({ params: Promise.resolve({ token: "tok123" }) }))

    expect(screen.getByText(/you.re already a member of weekend crew/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /go to clique/i })).toHaveAttribute(
      "href",
      "/?cliqueId=clique-1"
    )
    expect(screen.queryByText("Invite unavailable")).not.toBeInTheDocument()
  })
})
