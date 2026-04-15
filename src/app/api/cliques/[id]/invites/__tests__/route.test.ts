import { NextRequest } from "next/server"
import { GET, POST } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import * as inviteService from "@/lib/invite-service"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    clique: {
      findUnique: jest.fn(),
    },
    cliqueMember: {
      findUnique: jest.fn(),
    },
    cliqueInvite: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/invite-service", () => ({
  generateInviteToken: jest.fn().mockReturnValue("a".repeat(64)),
  getInviteExpiry: jest.fn().mockReturnValue(new Date("2027-01-01T00:00:00.000Z")),
  sendInviteEmail: jest.fn().mockResolvedValue(undefined),
}))

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/cliques/[id]/invites
// ──────────────────────────────────────────────────────────────────────────────
describe("GET /api/cliques/[id]/invites", () => {
  afterEach(() => jest.clearAllMocks())

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites")
    const res = await GET(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Unauthorized" })
  })

  it("should return 403 when requester is not the creator", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ creatorId: "user2" })

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites")
    const res = await GET(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Forbidden" })
  })

  it("should return 404 when clique not found", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/cliques/nonexistent/invites")
    const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) })

    expect(res.status).toBe(404)
  })

  it("should return only PENDING invites for the clique creator", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ creatorId: "user1" })

    const mockInvites = [
      { id: "inv1", token: "tok1", status: "PENDING", cliqueId: "clique1", createdBy: { id: "user1", name: "Alice" } },
    ]
    ;(prisma.cliqueInvite.findMany as jest.Mock).mockResolvedValue(mockInvites)

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites")
    const res = await GET(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(prisma.cliqueInvite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cliqueId: "clique1", status: "PENDING" },
      })
    )
  })

  it("should not include invites for other cliques", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ creatorId: "user1" })
    ;(prisma.cliqueInvite.findMany as jest.Mock).mockResolvedValue([])

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites")
    await GET(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(prisma.cliqueInvite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ cliqueId: "clique1" }),
      })
    )
  })

  it("should handle database errors", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"))

    const spy = jest.spyOn(console, "error").mockImplementation()
    const req = new NextRequest("http://localhost/api/cliques/clique1/invites")
    const res = await GET(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/cliques/[id]/invites — link type
// ──────────────────────────────────────────────────────────────────────────────
describe("POST /api/cliques/[id]/invites (link type)", () => {
  afterEach(() => jest.clearAllMocks())

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites", {
      method: "POST",
      body: JSON.stringify({ type: "link" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(401)
  })

  it("should return 403 when requester is not a member", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ id: "clique1" })

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites", {
      method: "POST",
      body: JSON.stringify({ type: "link" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(403)
  })

  it("should create a link invite with a 64-char token and PENDING status", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })

    const mockInvite = {
      id: "inv1",
      token: "a".repeat(64),
      status: "PENDING",
      cliqueId: "clique1",
      expiresAt: "2027-01-01T00:00:00.000Z",
      createdBy: { id: "user1", name: "Alice" },
    }
    ;(prisma.cliqueInvite.create as jest.Mock).mockResolvedValue(mockInvite)

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites", {
      method: "POST",
      body: JSON.stringify({ type: "link" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.status).toBe("PENDING")
    expect(data.token).toHaveLength(64)
    expect(inviteService.generateInviteToken).toHaveBeenCalled()
    expect(inviteService.getInviteExpiry).toHaveBeenCalled()
  })

  it("token is 64 hex characters (crypto-random via mock)", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })
    ;(prisma.cliqueInvite.create as jest.Mock).mockResolvedValue({
      token: "a".repeat(64),
      status: "PENDING",
      createdBy: { id: "user1", name: "Alice" },
    })

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites", {
      method: "POST",
      body: JSON.stringify({ type: "link" }),
    })
    await POST(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(inviteService.generateInviteToken).toHaveBeenCalled()
    const token = (inviteService.generateInviteToken as jest.Mock).mock.results[0].value as string
    expect(token).toHaveLength(64)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/cliques/[id]/invites — user type
// ──────────────────────────────────────────────────────────────────────────────
describe("POST /api/cliques/[id]/invites (user type)", () => {
  afterEach(() => jest.clearAllMocks())

  it("should return 400 when email is missing", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites", {
      method: "POST",
      body: JSON.stringify({ type: "user" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain("email")
  })

  it("should return 400 when email is not a valid address", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites", {
      method: "POST",
      body: JSON.stringify({ type: "user", email: "not-an-email" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain("valid email")
  })

  it("should return 404 when no matching user found", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites", {
      method: "POST",
      body: JSON.stringify({ type: "user", email: "unknown@test.com" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(404)
  })

  it("should create invite and send in-app notification to invitee", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })
    // First findUnique call: invitee; second: inviter
    ;(prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: "user2", name: "Bob", email: "bob@test.com" })
      .mockResolvedValueOnce({ name: "Alice" })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ name: "Movie Buffs" })
    ;(prisma.cliqueInvite.create as jest.Mock).mockResolvedValue({
      id: "inv1",
      token: "a".repeat(64),
      status: "PENDING",
      createdBy: { id: "user1", name: "Alice" },
    })
    ;(prisma.notification.create as jest.Mock).mockResolvedValue({})
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        cliqueInvite: { create: prisma.cliqueInvite.create },
        notification: { create: prisma.notification.create },
      }
      return cb(tx)
    })

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites", {
      method: "POST",
      body: JSON.stringify({ type: "user", email: "bob@test.com" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(201)
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user2",
          type: "CLIQUE_INVITE",
        }),
      })
    )
  })

  it("should send an email via invite service to the invitee", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1", userId: "user1" })
    // First findUnique call: invitee; second: inviter
    ;(prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: "user2", name: "Bob", email: "bob@test.com" })
      .mockResolvedValueOnce({ name: "Alice" })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ name: "Movie Buffs" })
    ;(prisma.cliqueInvite.create as jest.Mock).mockResolvedValue({
      id: "inv1",
      token: "a".repeat(64),
      status: "PENDING",
      createdBy: { id: "user1", name: "Alice" },
    })
    ;(prisma.notification.create as jest.Mock).mockResolvedValue({})
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        cliqueInvite: { create: prisma.cliqueInvite.create },
        notification: { create: prisma.notification.create },
      }
      return cb(tx)
    })

    const req = new NextRequest("http://localhost/api/cliques/clique1/invites", {
      method: "POST",
      body: JSON.stringify({ type: "user", email: "bob@test.com" }),
    })
    await POST(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(inviteService.sendInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: "bob@test.com" })
    )
  })

  it("should handle database errors", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"))

    const spy = jest.spyOn(console, "error").mockImplementation()
    const req = new NextRequest("http://localhost/api/cliques/clique1/invites", {
      method: "POST",
      body: JSON.stringify({ type: "link" }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: "clique1" }) })

    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})
