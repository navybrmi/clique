/**
 * Error thrown when a clique or membership limit has been exceeded.
 * Used to distinguish limit violations from unexpected database errors
 * in the catch block of API routes.
 */
export class LimitExceededError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LimitExceededError"
  }
}

/**
 * Converts a string to a stable 32-bit integer for use as a
 * PostgreSQL transaction-scoped advisory lock key.
 *
 * Uses a djb2-style hash: fast, low-collision for short ASCII strings
 * like CUID IDs.
 */
export function hashStringToInt(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return hash
}
