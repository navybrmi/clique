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
