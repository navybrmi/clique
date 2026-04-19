import { NextRequest } from "next/server"
import { POST, DELETE } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cliqueMember: {
      findUnique: jest.fn(),
    },
    cliqueRecommendation: {
      findUnique: jest.fn(),
    },
    upVote: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

const BASE_URL = "http://localhost/api/recommendations/rec1/upvotes"

describe("POST /api/recommendations/[id]/upvotes", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest(BASE_URL + "?cliqueId=clique1", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "rec1" }) })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Unauthorized" })
  })

  it("returns 400 when cliqueId is missing", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    const req = new NextRequest(BASE_URL, { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "rec1" }) })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: "cliqueId is required" })
  })

  it("returns 403 when user is not a clique member", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.cliqueRecommendation.findUnique as jest.Mock).mockResolvedValue({
      recommendationId: "rec1",
    })
    const req = new NextRequest(BASE_URL + "?cliqueId=clique1", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "rec1" }) })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "Forbidden" })
  })

  it("returns 404 when recommendation is not in the clique", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ userId: "user1" })
    ;(prisma.cliqueRecommendation.findUnique as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest(BASE_URL + "?cliqueId=clique1", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "rec1" }) })
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "Recommendation not found in clique" })
  })

  it("creates upvote and returns updated count", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ userId: "user1" })
    ;(prisma.cliqueRecommendation.findUnique as jest.Mock).mockResolvedValue({
      recommendationId: "rec1",
    })
    ;(prisma.upVote.upsert as jest.Mock).mockResolvedValue({})
    ;(prisma.upVote.count as jest.Mock).mockResolvedValue(5)

    const req = new NextRequest(BASE_URL + "?cliqueId=clique1", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "rec1" }) })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ upvotes: 5 })
    expect(prisma.upVote.upsert).toHaveBeenCalledWith({
      where: { userId_recommendationId: { userId: "user1", recommendationId: "rec1" } },
      create: { userId: "user1", recommendationId: "rec1" },
      update: {},
    })
  })

  it("is idempotent — upserting twice still returns count", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockResolvedValue({ userId: "user1" })
    ;(prisma.cliqueRecommendation.findUnique as jest.Mock).mockResolvedValue({
      recommendationId: "rec1",
    })
    ;(prisma.upVote.upsert as jest.Mock).mockResolvedValue({})
    ;(prisma.upVote.count as jest.Mock).mockResolvedValue(3)

    const req = new NextRequest(BASE_URL + "?cliqueId=clique1", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "rec1" }) })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ upvotes: 3 })
  })

  it("returns 500 on database error", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.cliqueMember.findUnique as jest.Mock).mockRejectedValue(
      new Error("DB error")
    )
    const consoleSpy = jest.spyOn(console, "error").mockImplementation()

    const req = new NextRequest(BASE_URL + "?cliqueId=clique1", { method: "POST" })
    const res = await POST(req, { params: Promise.resolve({ id: "rec1" }) })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Failed to upvote" })
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

describe("DELETE /api/recommendations/[id]/upvotes", () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest(BASE_URL, { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "rec1" }) })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Unauthorized" })
  })

  it("removes upvote and returns updated count", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.upVote.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(prisma.upVote.count as jest.Mock).mockResolvedValue(4)

    const req = new NextRequest(BASE_URL, { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "rec1" }) })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ upvotes: 4 })
    expect(prisma.upVote.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user1", recommendationId: "rec1" },
    })
  })

  it("is idempotent — deleting a non-existent upvote still returns count", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.upVote.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
    ;(prisma.upVote.count as jest.Mock).mockResolvedValue(2)

    const req = new NextRequest(BASE_URL, { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "rec1" }) })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ upvotes: 2 })
  })

  it("returns 500 on database error", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.upVote.deleteMany as jest.Mock).mockRejectedValue(new Error("DB error"))
    const consoleSpy = jest.spyOn(console, "error").mockImplementation()

    const req = new NextRequest(BASE_URL, { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "rec1" }) })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Failed to remove upvote" })
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
