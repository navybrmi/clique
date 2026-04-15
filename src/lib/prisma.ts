import { PrismaClient } from '@prisma/client'

/**
 * Global augmentation for Prisma client instance.
 * Prevents multiple Prisma Client instances in development due to hot reloading.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Returns whether a cached Prisma client instance still matches the current
 * generated schema shape at runtime.
 *
 * During local development, hot reloading can preserve an older Prisma client
 * instance on `globalThis` after schema changes. When that happens, newly added
 * model delegates like `prisma.clique` are missing until a fresh client is created.
 *
 * @param client - Cached Prisma client instance, if any
 * @returns True when the cached client exposes the current schema delegates
 */
function hasCurrentSchema(client: PrismaClient | undefined): client is PrismaClient {
  const cliqueDelegate = (
    client as unknown as { clique?: { findMany?: unknown } } | undefined
  )?.clique
  return typeof cliqueDelegate?.findMany === 'function'
}

/**
 * Resolves the current Prisma client instance, replacing any stale cached
 * development client whose generated schema no longer matches the app code.
 *
 * @returns A Prisma client whose model delegates match the current schema
 */
export function getPrismaClient(): PrismaClient {
  if (!hasCurrentSchema(globalForPrisma.prisma)) {
    globalForPrisma.prisma = new PrismaClient()
  }

  return globalForPrisma.prisma
}

/**
 * Singleton Prisma Client instance.
 * 
 * In development, this uses a global variable to prevent creating multiple instances
 * during hot module replacement. In production, a new instance is created.
 * 
 * @see {@link https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances}
 */
export const prisma = getPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
