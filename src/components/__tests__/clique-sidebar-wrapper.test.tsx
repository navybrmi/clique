import "@testing-library/jest-dom"
import React from "react"
import { render, screen } from "@testing-library/react"

jest.mock("@/lib/prisma", () => ({
  getPrismaClient: jest.fn(),
}))

jest.mock("@/components/clique-sidebar", () => ({
  CliqueSidebar: ({
    cliques,
    activeCliqueId,
    userId,
    currentCliqueId,
  }: {
    cliques: { id: string; name: string }[]
    activeCliqueId?: string
    userId?: string | null
    currentCliqueId?: string
  }) => (
    <div
      data-testid="clique-sidebar"
      data-count={cliques.length}
      data-active={activeCliqueId ?? ""}
      data-userid={userId ?? ""}
      data-current-clique={currentCliqueId ?? ""}
    />
  ),
}))

jest.mock("@/components/mobile-sidebar-sheet", () => ({
  MobileSidebarSheet: () => <div data-testid="mobile-sidebar-sheet" />,
}))

jest.mock("@/components/create-clique-dialog", () => ({
  CreateCliqueDialog: () => <button data-testid="create-clique-dialog">Create Clique</button>,
}))

import { getPrismaClient } from "@/lib/prisma"
import { CliqueSidebarWrapper } from "@/components/clique-sidebar-wrapper"

describe("CliqueSidebarWrapper", () => {
  afterEach(() => jest.clearAllMocks())

  it("returns null when userId is not provided", async () => {
    const result = await CliqueSidebarWrapper({})
    expect(result).toBeNull()
  })

  it("returns null when userId is null", async () => {
    const result = await CliqueSidebarWrapper({ userId: null })
    expect(result).toBeNull()
  })

  it("fetches cliques via findMany and renders the sidebar", async () => {
    const mockCliques = [
      { id: "c1", name: "Weekend Crew" },
      { id: "c2", name: "Movie Night" },
    ]
    const mockFindMany = jest.fn().mockResolvedValue(mockCliques)
    ;(getPrismaClient as jest.Mock).mockReturnValue({
      clique: { findMany: mockFindMany },
    })

    const jsx = await CliqueSidebarWrapper({ userId: "user1", activeCliqueId: "c1", currentCliqueId: "c1" })
    const { getByTestId } = render(jsx as React.ReactElement)

    const sidebar = getByTestId("clique-sidebar")
    expect(sidebar).toBeInTheDocument()
    expect(sidebar.getAttribute("data-count")).toBe("2")
    expect(sidebar.getAttribute("data-active")).toBe("c1")
    expect(sidebar.getAttribute("data-userid")).toBe("user1")
    expect(sidebar.getAttribute("data-current-clique")).toBe("c1")
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { members: { some: { userId: "user1" } } },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    })
  })

  it("falls back to $queryRaw when clique.findMany is not a function", async () => {
    const mockCliques = [{ id: "c3", name: "Foodies" }]
    const mockQueryRaw = jest.fn().mockResolvedValue(mockCliques)
    ;(getPrismaClient as jest.Mock).mockReturnValue({
      clique: { findMany: undefined },
      $queryRaw: mockQueryRaw,
    })

    const jsx = await CliqueSidebarWrapper({ userId: "user1" })
    const { getByTestId } = render(jsx as React.ReactElement)

    const sidebar = getByTestId("clique-sidebar")
    expect(sidebar).toBeInTheDocument()
    expect(sidebar.getAttribute("data-count")).toBe("1")
  })

  it("falls back to $queryRaw when clique delegate is undefined", async () => {
    const mockCliques: { id: string; name: string }[] = []
    const mockQueryRaw = jest.fn().mockResolvedValue(mockCliques)
    ;(getPrismaClient as jest.Mock).mockReturnValue({
      $queryRaw: mockQueryRaw,
    })

    const jsx = await CliqueSidebarWrapper({ userId: "user1" })
    render(jsx as React.ReactElement)

    expect(screen.getByTestId("clique-sidebar")).toBeInTheDocument()
    expect(screen.getByTestId("clique-sidebar").getAttribute("data-count")).toBe("0")
  })

  it("shows mobile empty-state CTA with CreateCliqueDialog when user has no cliques", async () => {
    const mockQueryRaw = jest.fn().mockResolvedValue([])
    ;(getPrismaClient as jest.Mock).mockReturnValue({ $queryRaw: mockQueryRaw })

    const jsx = await CliqueSidebarWrapper({ userId: "user1" })
    render(jsx as React.ReactElement)

    expect(screen.getByTestId("create-clique-dialog")).toBeInTheDocument()
    expect(screen.getByText("Create a clique for a better experience")).toBeInTheDocument()
  })

  it("shows mobile clique switcher banner when user has cliques but no active clique", async () => {
    const mockCliques = [{ id: "c1", name: "Weekend Crew" }]
    const mockFindMany = jest.fn().mockResolvedValue(mockCliques)
    ;(getPrismaClient as jest.Mock).mockReturnValue({ clique: { findMany: mockFindMany } })

    const jsx = await CliqueSidebarWrapper({ userId: "user1" })
    render(jsx as React.ReactElement)

    expect(screen.getByText("Switch to a clique feed")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Weekend Crew" })).toBeInTheDocument()
  })

  it("does not show clique switcher banner when user is already viewing a clique feed", async () => {
    const mockCliques = [{ id: "c1", name: "Weekend Crew" }]
    const mockFindMany = jest.fn().mockResolvedValue(mockCliques)
    ;(getPrismaClient as jest.Mock).mockReturnValue({ clique: { findMany: mockFindMany } })

    const jsx = await CliqueSidebarWrapper({ userId: "user1", activeCliqueId: "c1" })
    render(jsx as React.ReactElement)

    expect(screen.queryByText("Switch to a clique feed")).not.toBeInTheDocument()
  })

  it("renders MobileSidebarSheet when mobileOnly is true", async () => {
    const mockFindMany = jest.fn().mockResolvedValue([])
    ;(getPrismaClient as jest.Mock).mockReturnValue({ clique: { findMany: mockFindMany } })

    const jsx = await CliqueSidebarWrapper({ userId: "user1", mobileOnly: true })
    render(jsx as React.ReactElement)

    expect(screen.getByTestId("mobile-sidebar-sheet")).toBeInTheDocument()
  })
})
