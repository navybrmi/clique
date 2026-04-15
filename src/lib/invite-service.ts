import crypto from "crypto"
import { Resend } from "resend"

/**
 * Escapes HTML special characters to prevent injection in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}

/**
 * Generates a cryptographically random 64-character hex invite token.
 */
export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Returns the invite expiry date: 1 year from now.
 */
export function getInviteExpiry(): Date {
  const expiry = new Date()
  expiry.setFullYear(expiry.getFullYear() + 1)
  return expiry
}

/**
 * Sends an invite email to the given address via Resend.
 * Returns silently if RESEND_API_KEY is not configured (e.g., in dev/test).
 */
export async function sendInviteEmail({
  toEmail,
  inviterName,
  cliqueName,
  inviteToken,
}: {
  toEmail: string
  inviterName: string | null
  cliqueName: string
  inviteToken: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  const resend = new Resend(apiKey)
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/invite/${inviteToken}`
  const fromName = escapeHtml(inviterName ?? "Someone")
  const safecliqueName = escapeHtml(cliqueName)

  await resend.emails.send({
    from: "Clique <noreply@clique.app>",
    to: toEmail,
    subject: `${fromName} invited you to join "${safecliqueName}" on Clique`,
    html: `
      <p>Hi,</p>
      <p><strong>${fromName}</strong> has invited you to join the clique <strong>${safecliqueName}</strong> on Clique.</p>
      <p><a href="${inviteUrl}">Click here to accept the invite</a></p>
      <p>This invite link expires in 1 year.</p>
    `,
  })
}
