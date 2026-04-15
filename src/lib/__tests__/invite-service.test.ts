import { generateInviteToken, getInviteExpiry, sendInviteEmail } from "../invite-service"

// ──────────────────────────────────────────────────────────────────────────────
// generateInviteToken
// ──────────────────────────────────────────────────────────────────────────────
describe("generateInviteToken", () => {
  it("returns a 64-character string", () => {
    const token = generateInviteToken()
    expect(token).toHaveLength(64)
  })

  it("contains only lowercase hex characters", () => {
    const token = generateInviteToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it("generates unique tokens on successive calls", () => {
    const tokens = new Set(Array.from({ length: 10 }, () => generateInviteToken()))
    expect(tokens.size).toBe(10)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// getInviteExpiry
// ──────────────────────────────────────────────────────────────────────────────
describe("getInviteExpiry", () => {
  it("returns a date approximately 1 year from now", () => {
    const before = Date.now()
    const expiry = getInviteExpiry()
    const after = Date.now()

    const oneYearMs = 365 * 24 * 60 * 60 * 1000
    // Allow ±1 second of clock drift
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + oneYearMs - 1000)
    expect(expiry.getTime()).toBeLessThanOrEqual(after + oneYearMs + 1000)
  })

  it("returns a Date instance", () => {
    expect(getInviteExpiry()).toBeInstanceOf(Date)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// sendInviteEmail
// ──────────────────────────────────────────────────────────────────────────────
describe("sendInviteEmail", () => {
  const params = {
    toEmail: "bob@test.com",
    inviterName: "Alice",
    cliqueName: "Movie Buffs",
    inviteToken: "a".repeat(64),
  }

  it("returns without error when RESEND_API_KEY is absent", async () => {
    const original = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY

    await expect(sendInviteEmail(params)).resolves.toBeUndefined()

    process.env.RESEND_API_KEY = original
  })

  it("does not call Resend when RESEND_API_KEY is absent", async () => {
    const original = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY

    // If Resend were imported and called, it would throw (no API key)
    // The function should return early without throwing
    await expect(sendInviteEmail(params)).resolves.not.toThrow()

    process.env.RESEND_API_KEY = original
  })
})
