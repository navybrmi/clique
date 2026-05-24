import { NextRequest } from "next/server"
import { GET, POST } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cliqueInvite: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    cliqueMember: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    cliqueMembershipRequest: {
      findUnique: jest.fn(),
    },
    clique: {
      findUnique: jest.fn(),
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

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/invites/[token]
// ──────────────────────────────────────────────────────────────────────────────
describe("GET /api/invites/[token]", () => {
  afterEach(() => jest.clearAllMocks())

  it("should return invite metadata without auth", async () => {
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      status: "PENDING",
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      clique: { name: "Movie Buffs" },
    })

    const req = new NextRequest("http://localhost/api/invites/sometoken")
    const res = await GET(req, { params: Promise.resolve({ token: "sometoken" }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.cliqueName).toBe("Movie Buffs")
    expect(data.status).toBe("PENDING")
    expect(data.id).toBeUndefined()
  })

  it("should return 404 for an unknown token", async () => {
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/invites/badtoken")
    const res = await GET(req, { params: Promise.resolve({ token: "badtoken" }) })

    expect(res.status).toBe(404)
  })

  it("should return REVOKED status for a revoked invite", async () => {
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      status: "REVOKED",
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      clique: { name: "Movie Buffs" },
    })

    const req = new NextRequest("http://localhost/api/invites/revokedtoken")
    const res = await GET(req, { params: Promise.resolve({ token: "revokedtoken" }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe("REVOKED")
  })

  it("should handle database errors", async () => {
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"))

    const spy = jest.spyOn(console, "error").mockImplementation()
    const req = new NextRequest("http://localhost/api/invites/sometoken")
    const res = await GET(req, { params: Promise.resolve({ token: "sometoken" }) })

    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/invites/[token]
// ──────────────────────────────────────────────────────────────────────────────
describe("POST /api/invites/[token]", () => {
  afterEach(() => jest.clearAllMocks())

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/invites/sometoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "sometoken" }) })

    expect(res.status).toBe(401)
  })

  it("should return 404 for an unknown token", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/invites/badtoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "badtoken" }) })

    expect(res.status).toBe(404)
  })

  it("should return 409 when token is REVOKED", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "clique1",
      status: "REVOKED",
      expiresAt: new Date("2027-01-01"),
    })

    const req = new NextRequest("http://localhost/api/invites/revokedtoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "revokedtoken" }) })

    expect(res.status).toBe(409)
  })

  it("should return 409 when token is ACCEPTED", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "clique1",
      status: "ACCEPTED",
      expiresAt: new Date("2027-01-01"),
    })

    const req = new NextRequest("http://localhost/api/invites/usedtoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "usedtoken" }) })

    expect(res.status).toBe(409)
  })

  it("should return 409 when token is EXPIRED", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "clique1",
      status: "EXPIRED",
      expiresAt: new Date("2027-01-01"),
    })

    const req = new NextRequest("http://localhost/api/invites/expiredtoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "expiredtoken" }) })

    expect(res.status).toBe(409)
  })

  it("should return 409 when invite expiry date has passed", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "clique1",
      status: "PENDING",
      expiresAt: new Date("2020-01-01"),
    })

    const req = new NextRequest("http://localhost/api/invites/oldtoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "oldtoken" }) })

    expect(res.status).toBe(409)
  })

  it("should return 409 when user is already a member of the clique", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "clique1",
      status: "PENDING",
      expiresAt: new Date("2027-01-01"),
    })
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue(undefined),
        cliqueMember: {
          findUnique: jest.fn().mockResolvedValue({ cliqueId: "clique1" }),
          count: jest.fn(),
          create: jest.fn(),
        },
        cliqueInvite: { updateMany: jest.fn() },
      }
      return cb(tx)
    })

    const req = new NextRequest("http://localhost/api/invites/sometoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "sometoken" }) })
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toContain("already a member")
  })

  it("should return 409 when clique already has 50 members", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "clique1",
      status: "PENDING",
      expiresAt: new Date("2027-01-01"),
    })
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue(undefined),
        cliqueMember: {
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(50),
          create: jest.fn(),
        },
        cliqueInvite: { updateMany: jest.fn() },
      }
      return cb(tx)
    })

    const req = new NextRequest("http://localhost/api/invites/fulltoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "fulltoken" }) })
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toContain("50 members")
  })

  it("should return 409 when user already belongs to 10 cliques", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "clique1",
      status: "PENDING",
      expiresAt: new Date("2027-01-01"),
    })
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue(undefined),
        cliqueMember: {
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn()
            .mockResolvedValueOnce(5)   // member count for clique
            .mockResolvedValueOnce(10), // user's clique count
          create: jest.fn(),
        },
        cliqueInvite: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      }
      return cb(tx)
    })

    const req = new NextRequest("http://localhost/api/invites/sometoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "sometoken" }) })
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toContain("10 cliques")
  })

  it("should successfully add user as member and mark invite ACCEPTED", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "clique1",
      status: "PENDING",
      expiresAt: new Date("2027-01-01"),
    })
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue(undefined),
        cliqueMember: {
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(3),
          create: jest.fn().mockResolvedValue({}),
        },
        cliqueInvite: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      }
      return cb(tx)
    })

    const req = new NextRequest("http://localhost/api/invites/validtoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "validtoken" }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ message: "Invite accepted", cliqueId: "clique1" })
  })

  it("re-submitting an already accepted token returns 409", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "clique1",
      status: "ACCEPTED",
      expiresAt: new Date("2027-01-01"),
    })

    const req = new NextRequest("http://localhost/api/invites/acceptedtoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "acceptedtoken" }) })

    expect(res.status).toBe(409)
  })

  it("should return 409 when concurrent request wins the updateMany race", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      id: "inv1",
      cliqueId: "clique1",
      status: "PENDING",
      expiresAt: new Date("2027-01-01"),
    })
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue(undefined),
        cliqueMember: {
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(3),
          create: jest.fn(),
        },
        // Simulate another request winning the race: count === 0
        cliqueInvite: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      }
      return cb(tx)
    })

    const req = new NextRequest("http://localhost/api/invites/racetoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "racetoken" }) })
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toContain("already been accepted")
  })

  it("should handle database errors", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"))

    const spy = jest.spyOn(console, "error").mockImplementation()
    const req = new NextRequest("http://localhost/api/invites/sometoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "sometoken" }) })

    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/invites/[token] — link-type invites (email === null)
// ──────────────────────────────────────────────────────────────────────────────
describe("POST /api/invites/[token] — link-type invite", () => {
  const linkInvite = {
    id: "inv1",
    cliqueId: "clique1",
    status: "PENDING",
    expiresAt: new Date("2027-01-01"),
    email: null,
  }

  afterEach(() => jest.clearAllMocks())

  it("should return 409 when link invite status is REVOKED", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      ...linkInvite,
      status: "REVOKED",
    })

    const req = new NextRequest("http://localhost/api/invites/revokedlink", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "revokedlink" }) })
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toContain("revoked")
  })

  it("should return 410 when link invite has expired", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue({
      ...linkInvite,
      expiresAt: new Date("2020-01-01"),
    })

    const req = new NextRequest("http://localhost/api/invites/expiredlink", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "expiredlink" }) })
    const data = await res.json()

    expect(res.status).toBe(410)
    expect(data.error).toContain("expired")
  })

  it("should return 409 when user is already a member via link invite", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue(linkInvite)
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ cliqueId: "clique1" })
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ name: "Movie Buffs", creatorId: "creator1" })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ name: "Alice", image: null })

    const req = new NextRequest("http://localhost/api/invites/linktoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "linktoken" }) })
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.error).toContain("already a member")
  })

  it("should return 200 with already_pending when a pending request already exists", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue(linkInvite)
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue({
      id: "req1",
      status: "PENDING",
    })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ name: "Movie Buffs", creatorId: "creator1" })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ name: "Alice", image: null })

    const req = new NextRequest("http://localhost/api/invites/linktoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "linktoken" }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ status: "already_pending" })
  })

  it("should create a membership request and notification and return pending", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue(linkInvite)
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ name: "Movie Buffs", creatorId: "creator1" })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ name: "Alice", image: "https://example.com/avatar.png" })

    const mockRequest = { id: "req1", cliqueId: "clique1", userId: "user1" }
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      const tx = {
        cliqueMembershipRequest: {
          upsert: jest.fn().mockResolvedValue(mockRequest),
        },
        notification: {
          create: jest.fn().mockResolvedValue({}),
        },
      }
      return cb(tx)
    })

    const req = new NextRequest("http://localhost/api/invites/linktoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "linktoken" }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ status: "pending" })
  })

  it("should pass correct upsert args when creating a membership request", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue(linkInvite)
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ name: "Movie Buffs", creatorId: "creator1" })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ name: "Alice", image: null })

    const upsertMock = jest.fn().mockResolvedValue({ id: "req1" })
    const createNotificationMock = jest.fn().mockResolvedValue({})
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      return cb({
        cliqueMembershipRequest: { upsert: upsertMock },
        notification: { create: createNotificationMock },
      })
    })

    const req = new NextRequest("http://localhost/api/invites/linktoken", { method: "POST" })
    await POST(req, { params: Promise.resolve({ token: "linktoken" }) })

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cliqueId_userId: { cliqueId: "clique1", userId: "user1" } },
        create: expect.objectContaining({ cliqueId: "clique1", userId: "user1", inviteToken: "linktoken", status: "PENDING" }),
        update: expect.objectContaining({ status: "PENDING", inviteToken: "linktoken" }),
      })
    )

    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "creator1",
          type: "CLIQUE_JOIN_REQUEST",
          payload: expect.objectContaining({
            type: "CLIQUE_JOIN_REQUEST",
            cliqueId: "clique1",
            requesterId: "user1",
          }),
        }),
      })
    )
  })

  it("should handle database errors in the link-invite path", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueInvite.findUnique as jest.Mock).mockResolvedValue(linkInvite)
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ name: "Movie Buffs", creatorId: "creator1" })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ name: "Alice", image: null })
    ;(prisma.$transaction as jest.Mock).mockRejectedValue(new Error("DB error"))

    const spy = jest.spyOn(console, "error").mockImplementation()
    const req = new NextRequest("http://localhost/api/invites/linktoken", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ token: "linktoken" }) })

    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})
