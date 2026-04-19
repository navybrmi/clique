import "@testing-library/jest-dom"
import React from "react"
import userEvent from "@testing-library/user-event"
import { render, screen } from "@testing-library/react"

jest.mock("@radix-ui/react-portal", () => ({
  __esModule: true,
  Portal: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock("@/components/clique-management-dialog", () => ({
  CliqueManagementDialog: () => <div data-testid="mock-mgmt-dialog" />,
}))

jest.mock("@/components/clique-invite-dialog", () => ({
  CliqueInviteDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="mock-invite-dialog" /> : null,
}))

import { CliquePanel, CliquePanelMember } from "@/components/clique-panel"

const baseMembers: CliquePanelMember[] = [
  {
    userId: "user-1",
    name: "Alice Smith",
    email: "alice@example.com",
    image: null,
    isCreator: true,
  },
  {
    userId: "user-2",
    name: "Bob Jones",
    email: "bob@example.com",
    image: null,
    isCreator: false,
  },
]

function renderPanel(overrides: Partial<React.ComponentProps<typeof CliquePanel>> = {}) {
  return render(
    <CliquePanel
      cliqueId="clique-1"
      cliqueName="Weekend Crew"
      currentUserId="user-1"
      members={baseMembers}
      {...overrides}
    />
  )
}

describe("CliquePanel", () => {
  it("renders the clique name", () => {
    renderPanel()
    expect(screen.getByText("Weekend Crew")).toBeInTheDocument()
  })

  it("renders all member names", () => {
    renderPanel()
    expect(screen.getByText("Alice Smith")).toBeInTheDocument()
    expect(screen.getByText("Bob Jones")).toBeInTheDocument()
  })

  it("renders the Members heading", () => {
    renderPanel()
    expect(screen.getByText("Members")).toBeInTheDocument()
  })

  it("shows a crown icon for the creator member", () => {
    renderPanel()
    expect(screen.getByLabelText("Creator")).toBeInTheDocument()
  })

  it("does not show a crown icon for non-creator members", () => {
    const onlyNonCreator: CliquePanelMember[] = [
      {
        userId: "user-2",
        name: "Bob Jones",
        email: "bob@example.com",
        image: null,
        isCreator: false,
      },
    ]
    renderPanel({ members: onlyNonCreator })
    expect(screen.queryByLabelText("Creator")).not.toBeInTheDocument()
  })

  it("renders initials avatar when member has no image", () => {
    renderPanel()
    // Alice Smith → "AS", Bob Jones → "BJ"
    expect(screen.getByText("AS")).toBeInTheDocument()
    expect(screen.getByText("BJ")).toBeInTheDocument()
  })

  it("renders initials from email when name is null", () => {
    const members: CliquePanelMember[] = [
      {
        userId: "user-3",
        name: null,
        email: "charlie@example.com",
        image: null,
        isCreator: false,
      },
    ]
    renderPanel({ members })
    // email split by whitespace → single word "charlie@example.com" → first letter "C"
    expect(screen.getByText("C")).toBeInTheDocument()
  })

  it("renders an img element when member has an image URL", () => {
    const members: CliquePanelMember[] = [
      {
        userId: "user-4",
        name: "Diana",
        email: "diana@example.com",
        image: "https://example.com/avatar.png",
        isCreator: false,
      },
    ]
    renderPanel({ members })
    const img = screen.getByRole("img", { name: "Diana" })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute("src", "https://example.com/avatar.png")
  })

  it("uses email as img alt text when name is null", () => {
    const members: CliquePanelMember[] = [
      {
        userId: "user-5",
        name: null,
        email: "eve@example.com",
        image: "https://example.com/eve.png",
        isCreator: false,
      },
    ]
    renderPanel({ members })
    expect(screen.getByRole("img", { name: "eve@example.com" })).toBeInTheDocument()
  })

  it("renders the CliqueManagementDialog", () => {
    renderPanel()
    expect(screen.getByTestId("mock-mgmt-dialog")).toBeInTheDocument()
  })

  it("invite dialog is not shown initially", () => {
    renderPanel()
    expect(screen.queryByTestId("mock-invite-dialog")).not.toBeInTheDocument()
  })

  it("clicking the Add member button opens the CliqueInviteDialog", async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole("button", { name: /add member/i }))

    expect(screen.getByTestId("mock-invite-dialog")).toBeInTheDocument()
  })

  it("renders member email when name is null in the list", () => {
    const members: CliquePanelMember[] = [
      {
        userId: "user-6",
        name: null,
        email: "frank@example.com",
        image: null,
        isCreator: false,
      },
    ]
    renderPanel({ members })
    expect(screen.getByText("frank@example.com")).toBeInTheDocument()
  })

  it("renders multiple crown icons when multiple creators exist", () => {
    const members: CliquePanelMember[] = [
      { userId: "u1", name: "A", email: "a@test.com", image: null, isCreator: true },
      { userId: "u2", name: "B", email: "b@test.com", image: null, isCreator: true },
    ]
    renderPanel({ members })
    expect(screen.getAllByLabelText("Creator")).toHaveLength(2)
  })
})
