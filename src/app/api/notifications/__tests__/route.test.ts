import { NextRequest } from "next/server"
import { GET, PATCH } from "../route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    cliqueMembershipRequest: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/notifications
// ──────────────────────────────────────────────────────────────────────────────
describe("GET /api/notifications", () => {
  afterEach(() => jest.clearAllMocks())

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "Unauthorized" })
  })

  it("should return up to 50 most recent notifications for the current user", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })

    const mockNotifications = Array.from({ length: 5 }, (_, i) => ({
      id: `notif${i}`,
      userId: "user1",
      type: "CLIQUE_INVITE",
      payload: { type: "CLIQUE_INVITE", cliqueId: "c1", cliqueName: "Test", invitedById: "u2", invitedByName: "Bob", inviteToken: "tok" },
      read: false,
      createdAt: new Date().toISOString(),
    }))
    ;(prisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications)

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(5)
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user1" },
        take: 50,
        orderBy: { createdAt: "desc" },
      })
    )
  })

  it("should not return notifications belonging to other users", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.notification.findMany as jest.Mock).mockResolvedValue([])

    await GET()

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user1" } })
    )
  })

  it("should handle database errors", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.notification.findMany as jest.Mock).mockRejectedValue(new Error("DB error"))

    const spy = jest.spyOn(console, "error").mockImplementation()
    const res = await GET()

    expect(res.status).toBe(500)
    spy.mockRestore()
  })

  it("should keep CLIQUE_JOIN_REQUEST notifications whose request is still PENDING", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })

    const joinRequestNotif = {
      id: "notif1",
      userId: "creator1",
      type: "CLIQUE_JOIN_REQUEST",
      payload: {
        type: "CLIQUE_JOIN_REQUEST",
        cliqueId: "c1",
        cliqueName: "Test",
        requestId: "req1",
        requesterId: "user2",
        requesterName: "Alice",
        requesterImage: null,
      },
      read: false,
      createdAt: new Date().toISOString(),
    }
    ;(prisma.notification.findMany as jest.Mock).mockResolvedValue([joinRequestNotif])
    ;(prisma.cliqueMembershipRequest.findMany as jest.Mock).mockResolvedValue([{ id: "req1" }])

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe("notif1")
    expect(prisma.notification.deleteMany).not.toHaveBeenCalled()
  })

  it("should delete and exclude CLIQUE_JOIN_REQUEST notifications whose request is no longer PENDING", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })

    const staleNotif = {
      id: "notif-stale",
      userId: "creator1",
      type: "CLIQUE_JOIN_REQUEST",
      payload: {
        type: "CLIQUE_JOIN_REQUEST",
        cliqueId: "c1",
        cliqueName: "Test",
        requestId: "req-approved",
        requesterId: "user2",
        requesterName: "Alice",
        requesterImage: null,
      },
      read: false,
      createdAt: new Date().toISOString(),
    }
    ;(prisma.notification.findMany as jest.Mock).mockResolvedValue([staleNotif])
    // No PENDING requests returned — request was already approved/rejected
    ;(prisma.cliqueMembershipRequest.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.notification.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(0)
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["notif-stale"] } },
    })
  })

  it("should filter only stale CLIQUE_JOIN_REQUEST notifications when mixed with pending ones", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "creator1" } })

    const pendingNotif = {
      id: "notif-pending",
      userId: "creator1",
      type: "CLIQUE_JOIN_REQUEST",
      payload: {
        type: "CLIQUE_JOIN_REQUEST",
        cliqueId: "c1",
        cliqueName: "Test",
        requestId: "req-pending",
        requesterId: "user2",
        requesterName: "Alice",
        requesterImage: null,
      },
      read: false,
      createdAt: new Date().toISOString(),
    }
    const staleNotif = {
      id: "notif-stale",
      userId: "creator1",
      type: "CLIQUE_JOIN_REQUEST",
      payload: {
        type: "CLIQUE_JOIN_REQUEST",
        cliqueId: "c1",
        cliqueName: "Test",
        requestId: "req-approved",
        requesterId: "user3",
        requesterName: "Bob",
        requesterImage: null,
      },
      read: false,
      createdAt: new Date().toISOString(),
    }
    ;(prisma.notification.findMany as jest.Mock).mockResolvedValue([pendingNotif, staleNotif])
    ;(prisma.cliqueMembershipRequest.findMany as jest.Mock).mockResolvedValue([{ id: "req-pending" }])
    ;(prisma.notification.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe("notif-pending")
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["notif-stale"] } },
    })
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications
// ──────────────────────────────────────────────────────────────────────────────
describe("PATCH /api/notifications", () => {
  afterEach(() => jest.clearAllMocks())

  it("should return 401 when unauthenticated", async () => {
    ;(auth as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest("http://localhost/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({}),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(401)
  })

  it("should mark all notifications as read when no ids provided", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 })

    const req = new NextRequest("http://localhost/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({}),
    })
    const res = await PATCH(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ updated: 5 })
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user1" },
      data: { read: true },
    })
  })

  it("should return 400 when ids is not an array of strings", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })

    const req = new NextRequest("http://localhost/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ ids: "not-an-array" }),
    })
    const res = await PATCH(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain("array of strings")
  })

  it("should return 400 when ids contains non-string elements", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })

    const req = new NextRequest("http://localhost/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ ids: [1, 2, 3] }),
    })
    const res = await PATCH(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toContain("array of strings")
  })

  it("should mark only specified notification IDs as read", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 2 })

    const req = new NextRequest("http://localhost/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ ids: ["notif1", "notif2"] }),
    })
    const res = await PATCH(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ updated: 2 })
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user1", id: { in: ["notif1", "notif2"] } },
      data: { read: true },
    })
  })

  it("should treat missing ids as mark-all when body is not valid JSON", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 3 })

    const req = new NextRequest("http://localhost/api/notifications", {
      method: "PATCH",
      // No body — request.json() will throw, caught by .catch(() => ({}))
    })
    const res = await PATCH(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ updated: 3 })
    // Should have called updateMany with no id filter (mark-all)
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user1" },
      data: { read: true },
    })
  })

  it("should handle database errors", async () => {
    ;(auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } })
    ;(prisma.notification.updateMany as jest.Mock).mockRejectedValue(new Error("DB error"))

    const spy = jest.spyOn(console, "error").mockImplementation()
    const req = new NextRequest("http://localhost/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({}),
    })
    const res = await PATCH(req)

    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})
