import "@testing-library/jest-dom"
import React from "react"
import { render } from "@testing-library/react"

jest.mock("@/lib/prisma", () => ({
  getPrismaClient: jest.fn(),
}))

jest.mock("@/components/clique-sidebar", () => ({
  CliqueSidebar: ({
    cliques,
    activeCliqueId,
  }: {
    cliques: { id: string; name: string }[]
    activeCliqueId?: string
  }) => (
    <div
      data-testid="clique-sidebar"
      data-count={cliques.length}
      data-active={activeCliqueId ?? ""}
    />
  ),
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

    const jsx = await CliqueSidebarWrapper({ userId: "user1", activeCliqueId: "c1" })
    const { getByTestId } = render(jsx as React.ReactElement)

    const sidebar = getByTestId("clique-sidebar")
    expect(sidebar).toBeInTheDocument()
    expect(sidebar.getAttribute("data-count")).toBe("2")
    expect(sidebar.getAttribute("data-active")).toBe("c1")
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
    const { getByTestId } = render(jsx as React.ReactElement)

    expect(getByTestId("clique-sidebar")).toBeInTheDocument()
    expect(getByTestId("clique-sidebar").getAttribute("data-count")).toBe("0")
  })
})
