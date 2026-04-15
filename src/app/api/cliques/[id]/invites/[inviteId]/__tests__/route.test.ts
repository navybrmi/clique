import { NextRequest } from "next/server"
import { DELETE } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    clique: { findUnique: jest.fn() },
    cliqueInvite: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

describe("DELETE /api/cliques/[id]/invites/[inviteId]", () => {
  afterEach(() => jest.clearAllMocks())

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost/api/cliques/clique1/invites/inv1",
      { method: "DELETE" }
    )
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "clique1", inviteId: "inv1" }),
    })

    expect(res.status).toBe(401)
  })

  it("should return 403 when requester is not the creator", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ creatorId: "user2" })

    const req = new NextRequest(
      "http://localhost/api/cliques/clique1/invites/inv1",
      { method: "DELETE" }
    )
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "clique1", inviteId: "inv1" }),
    })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Forbidden" })
  })

  it("should return 404 when clique not found", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost/api/cliques/nonexistent/invites/inv1",
      { method: "DELETE" }
    )
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "nonexistent", inviteId: "inv1" }),
    })

    expect(res.status).toBe(404)
  })

  it("should return 404 when invite not found", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ creatorId: "user1" })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest(
      "http://localhost/api/cliques/clique1/invites/noninvite",
      { method: "DELETE" }
    )
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "clique1", inviteId: "noninvite" }),
    })

    expect(res.status).toBe(404)
  })

  it("should return 404 when invite belongs to a different clique", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ creatorId: "user1" })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "other-clique",
    })

    const req = new NextRequest(
      "http://localhost/api/cliques/clique1/invites/inv1",
      { method: "DELETE" }
    )
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "clique1", inviteId: "inv1" }),
    })

    expect(res.status).toBe(404)
  })

  it("should set invite status to REVOKED", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ creatorId: "user1" })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "clique1",
    })
    ;(prisma.cliqueInvite.update as jest.Mock).mockResolvedValue({})

    const req = new NextRequest(
      "http://localhost/api/cliques/clique1/invites/inv1",
      { method: "DELETE" }
    )
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "clique1", inviteId: "inv1" }),
    })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ message: "Invite revoked" })
    expect(prisma.cliqueInvite.update).toHaveBeenCalledWith({
      where: { id: "inv1" },
      data: { status: "REVOKED" },
    })
  })

  it("should handle database errors", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"))

    const spy = jest.spyOn(console, "error").mockImplementation()
    const req = new NextRequest(
      "http://localhost/api/cliques/clique1/invites/inv1",
      { method: "DELETE" }
    )
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "clique1", inviteId: "inv1" }),
    })

    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})
