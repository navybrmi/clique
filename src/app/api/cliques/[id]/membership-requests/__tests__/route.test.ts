import { NextRequest } from "next/server"
import { GET } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    clique: { findUnique: jest.fn() },
    cliqueMembershipRequest: { findMany: jest.fn() },
  },
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

const makeReq = () =>
  new NextRequest("http://localhost/api/cliques/clique1/membership-requests")

const makeParams = (id = "clique1") => ({
  params: Promise.resolve({ id }),
})

describe("GET /api/cliques/[id]/membership-requests", () => {
  afterEach(() => jest.clearAllMocks())

  it("returns 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(401)
  })

  it("returns 404 when clique does not exist", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(404)
  })

  it("returns 403 when caller is not the creator", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ creatorId: "other" })

    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(403)
  })

  it("returns empty array when no pending requests exist", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ creatorId: "creator1" })
    ;(prisma.cliqueMembershipRequest.findMany as jest.Mock).mockResolvedValue([])

    const res = await GET(makeReq(), makeParams())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual([])
  })

  it("returns pending requests with requester info", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockResolvedValue({ creatorId: "creator1" })
    ;(prisma.cliqueMembershipRequest.findMany as jest.Mock).mockResolvedValue([
      {
        id: "req1",
        cliqueId: "clique1",
        userId: "user2",
        inviteToken: "tok",
        status: "PENDING",
        createdAt: new Date("2027-01-01"),
        resolvedAt: null,
        user: { id: "user2", name: "Alice", image: null },
      },
    ])

    const res = await GET(makeReq(), makeParams())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe("req1")
    expect(data[0].user.name).toBe("Alice")
    expect(prisma.cliqueMembershipRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cliqueId: "clique1", status: "PENDING" },
      })
    )
  })

  it("returns 500 on database error", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })
    ;(prisma.clique.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"))

    const spy = jest.spyOn(console, "error").mockImplementation()
    const res = await GET(makeReq(), makeParams())
    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})
