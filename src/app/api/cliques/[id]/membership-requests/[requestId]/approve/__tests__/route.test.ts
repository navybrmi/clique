import { NextRequest } from "next/server"
import { POST } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    clique: { findUnique: jest.fn() },
    cliqueMembershipRequest: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

const makeReq = () =>
  new NextRequest("http://localhost/api/cliques/clique1/membership-requests/req1/approve", {
    method: "POST",
  })

const makeParams = (id = "clique1", requestId = "req1") => ({
  params: Promise.resolve({ id, requestId }),
})

const pendingRequest = {
  id: "req1",
  cliqueId: "clique1",
  userId: "requester1",
  status: "PENDING",
}

const clique = { creatorId: "creator1", name: "Movie Buffs" }

describe("POST /api/cliques/[id]/membership-requests/[requestId]/approve", () => {
  afterEach(() => jest.clearAllMocks())

  it("returns 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(401)
  })

  it("returns 404 when clique does not exist", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(pendingRequest)

    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(404)
  })

  it("returns 403 when caller is not the creator", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "notcreator" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(clique)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(pendingRequest)

    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(403)
  })

  it("returns 404 when request does not exist", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(clique)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(404)
  })

  it("returns 404 when request belongs to a different clique", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(clique)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue({
      ...pendingRequest,
      cliqueId: "other-clique",
    })

    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(404)
  })

  it("returns 409 when request is already approved", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(clique)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue({
      ...pendingRequest,
      status: "APPROVED",
    })

    const res = await POST(makeReq(), makeParams())
    const data = await res.json()
    expect(res.status).toBe(409)
    expect(data.error).toContain("approved")
  })

  it("returns 409 when request is already rejected", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(clique)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue({
      ...pendingRequest,
      status: "REJECTED",
    })

    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(409)
  })

  it("returns 409 when user is already a member", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(clique)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(pendingRequest)
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      return cb({
        $queryRaw: jest.fn().mockResolvedValue(undefined),
        cliqueMember: {
          findUnique: jest.fn().mockResolvedValue({ cliqueId: "clique1" }),
          count: jest.fn(),
          create: jest.fn(),
        },
        cliqueMembershipRequest: { updateMany: jest.fn() },
        notification: { create: jest.fn(), deleteMany: jest.fn() },
      })
    })

    const res = await POST(makeReq(), makeParams())
    const data = await res.json()
    expect(res.status).toBe(409)
    expect(data.error).toContain("already a member")
  })

  it("returns 409 when clique has 50 members", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(clique)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(pendingRequest)
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      return cb({
        $queryRaw: jest.fn().mockResolvedValue(undefined),
        cliqueMember: {
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(50),
          create: jest.fn(),
        },
        cliqueMembershipRequest: { updateMany: jest.fn() },
        notification: { create: jest.fn(), deleteMany: jest.fn() },
      })
    })

    const res = await POST(makeReq(), makeParams())
    const data = await res.json()
    expect(res.status).toBe(409)
    expect(data.error).toContain("50 members")
  })

  it("returns 409 when requester already belongs to 10 cliques", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(clique)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(pendingRequest)
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      return cb({
        $queryRaw: jest.fn().mockResolvedValue(undefined),
        cliqueMember: {
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn()
            .mockResolvedValueOnce(5)   // clique member count
            .mockResolvedValueOnce(10), // requester clique count
          create: jest.fn(),
        },
        cliqueMembershipRequest: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        notification: { create: jest.fn(), deleteMany: jest.fn() },
      })
    })

    const res = await POST(makeReq(), makeParams())
    const data = await res.json()
    expect(res.status).toBe(409)
    expect(data.error).toContain("10 cliques")
  })

  it("returns 409 when concurrent approval wins the race", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(clique)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(pendingRequest)
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      return cb({
        $queryRaw: jest.fn().mockResolvedValue(undefined),
        cliqueMember: {
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(3),
          create: jest.fn(),
        },
        cliqueMembershipRequest: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
        notification: { create: jest.fn(), deleteMany: jest.fn() },
      })
    })

    const res = await POST(makeReq(), makeParams())
    const data = await res.json()
    expect(res.status).toBe(409)
    expect(data.error).toContain("already been resolved")
  })

  it("approves the request, adds member, deletes join-request notification, and sends approved notification", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(clique)
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(pendingRequest)

    const updateMany = jest.fn().mockResolvedValue({ count: 1 })
    const createMember = jest.fn().mockResolvedValue({})
    const createNotification = jest.fn().mockResolvedValue({})
    const deleteNotifications = jest.fn().mockResolvedValue({ count: 1 })

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
      return cb({
        $queryRaw: jest.fn().mockResolvedValue(undefined),
        cliqueMember: {
          findUnique: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(3),
          create: createMember,
        },
        cliqueMembershipRequest: { updateMany },
        notification: { create: createNotification, deleteMany: deleteNotifications },
      })
    })

    const res = await POST(makeReq(), makeParams())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ message: "Request approved", cliqueId: "clique1" })
    expect(createMember).toHaveBeenCalledWith({
      data: { cliqueId: "clique1", userId: "requester1" },
    })
    expect(deleteNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "creator1",
          type: "CLIQUE_JOIN_REQUEST",
        }),
      })
    )
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "requester1",
          type: "CLIQUE_JOIN_APPROVED",
        }),
      })
    )
  })

  it("returns 500 on unexpected database error", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"))
    ;(prisma.cliqueMembershipRequest.findUnique as jest.Mock).mockResolvedValue(pendingRequest)

    const spy = jest.spyOn(console, "error").mockImplementation()
    const res = await POST(makeReq(), makeParams())
    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})
