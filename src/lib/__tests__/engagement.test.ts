import {
  getLikeTotals,
  getMyCliquesLikeCounts,
  getWithinCliqueLikeCounts,
  getUserCliquesForRecommendations,
  getCliqueCommentCounts,
} from "@/lib/engagement"
import { prisma } from "@/lib/prisma"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    upVote: { groupBy: jest.fn() },
    comment: { groupBy: jest.fn() },
    $queryRaw: jest.fn(),
  },
}))

const upVoteGroupBy = prisma.upVote.groupBy as unknown as jest.Mock
const commentGroupBy = prisma.comment.groupBy as unknown as jest.Mock
const queryRaw = prisma.$queryRaw as unknown as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe("getLikeTotals", () => {
  it("returns an empty map and issues no query for an empty id list", async () => {
    const result = await getLikeTotals([])
    expect(result.size).toBe(0)
    expect(upVoteGroupBy).not.toHaveBeenCalled()
  })

  it("maps global upvote totals per recommendation", async () => {
    upVoteGroupBy.mockResolvedValue([
      { recommendationId: "r1", _count: { _all: 5 } },
      { recommendationId: "r2", _count: { _all: 0 } },
    ])
    const result = await getLikeTotals(["r1", "r2", "r3"])
    expect(upVoteGroupBy).toHaveBeenCalledWith({
      by: ["recommendationId"],
      where: { recommendationId: { in: ["r1", "r2", "r3"] } },
      _count: { _all: true },
    })
    expect(result.get("r1")).toBe(5)
    expect(result.get("r2")).toBe(0)
    // r3 had no likes -> absent from the map (caller treats as 0)
    expect(result.has("r3")).toBe(false)
  })
})

describe("getMyCliquesLikeCounts", () => {
  it("returns an empty map and issues no query for an empty id list", async () => {
    const result = await getMyCliquesLikeCounts([], "u1")
    expect(result.size).toBe(0)
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it("converts bigint distinct-liker counts to numbers", async () => {
    queryRaw.mockResolvedValue([
      { recommendationId: "r1", cnt: BigInt(3) },
      { recommendationId: "r2", cnt: BigInt(1) },
    ])
    const result = await getMyCliquesLikeCounts(["r1", "r2"], "u1")
    expect(queryRaw).toHaveBeenCalledTimes(1)
    expect(result.get("r1")).toBe(3)
    expect(result.get("r2")).toBe(1)
  })
})

describe("getWithinCliqueLikeCounts", () => {
  it("returns an empty map and issues no query for an empty id list", async () => {
    const result = await getWithinCliqueLikeCounts([], "c1")
    expect(result.size).toBe(0)
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it("maps clique-member like counts, coercing bigint to number", async () => {
    queryRaw.mockResolvedValue([{ recommendationId: "r1", cnt: BigInt(2) }])
    const result = await getWithinCliqueLikeCounts(["r1"], "c1")
    expect(queryRaw).toHaveBeenCalledTimes(1)
    expect(result.get("r1")).toBe(2)
  })
})

describe("getUserCliquesForRecommendations", () => {
  it("returns an empty map and issues no query for an empty id list", async () => {
    const result = await getUserCliquesForRecommendations([], "u1")
    expect(result.size).toBe(0)
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it("groups cliques per recommendation, preserving DB order and coercing member counts", async () => {
    // Rows arrive pre-ordered by member_count DESC, name ASC from the query.
    queryRaw.mockResolvedValue([
      { recommendationId: "r1", id: "cBig", name: "Big", memberCount: BigInt(10) },
      { recommendationId: "r1", id: "cSmall", name: "Small", memberCount: BigInt(2) },
      { recommendationId: "r2", id: "cMid", name: "Mid", memberCount: BigInt(4) },
    ])
    const result = await getUserCliquesForRecommendations(["r1", "r2"], "u1")

    const r1 = result.get("r1")
    expect(r1).toEqual([
      { id: "cBig", name: "Big", memberCount: 10 },
      { id: "cSmall", name: "Small", memberCount: 2 },
    ])
    // order is preserved so callers can slice the top N directly
    expect(r1?.[0].id).toBe("cBig")

    expect(result.get("r2")).toEqual([
      { id: "cMid", name: "Mid", memberCount: 4 },
    ])
  })
})

describe("getCliqueCommentCounts", () => {
  it("returns an empty map and issues no query for an empty id list", async () => {
    const result = await getCliqueCommentCounts([], "c1")
    expect(result.size).toBe(0)
    expect(commentGroupBy).not.toHaveBeenCalled()
  })

  it("scopes the comment count to the given clique", async () => {
    commentGroupBy.mockResolvedValue([
      { recommendationId: "r1", _count: { _all: 4 } },
    ])
    const result = await getCliqueCommentCounts(["r1", "r2"], "c1")
    expect(commentGroupBy).toHaveBeenCalledWith({
      by: ["recommendationId"],
      where: { recommendationId: { in: ["r1", "r2"] }, cliqueId: "c1" },
      _count: { _all: true },
    })
    expect(result.get("r1")).toBe(4)
    expect(result.has("r2")).toBe(false)
  })
})
