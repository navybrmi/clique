import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Global augmentation for the cached Prisma client instance and schema-refresh state.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaSchemaRefreshAttempted: boolean | undefined
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
 * Disconnects a stale Prisma client before it is replaced in the global cache.
 *
 * @param client - Stale Prisma client instance slated for replacement
 */
function disconnectStaleClient(client: PrismaClient): void {
  void client.$disconnect().catch((error: unknown) => {
    console.error('Failed to disconnect stale Prisma client', error)
  })
}

/**
 * Resolves the current Prisma client instance, replacing any stale cached
 * client whose generated schema no longer matches the app code.
 *
 * If a replacement client still does not expose the expected delegates, the
 * stale replacement is cached and reused so the app does not create a new
 * Prisma client on every call before the process is restarted.
 *
 * @returns A Prisma client whose model delegates match the current schema when available
 */
export function getPrismaClient(): PrismaClient {
  const cachedClient = globalForPrisma.prisma

  if (hasCurrentSchema(cachedClient)) {
    globalForPrisma.prismaSchemaRefreshAttempted = false
    return cachedClient
  }

  if (cachedClient && globalForPrisma.prismaSchemaRefreshAttempted) {
    return cachedClient
  }

  if (cachedClient) {
    disconnectStaleClient(cachedClient)
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const nextClient = new PrismaClient({ adapter })
  globalForPrisma.prisma = nextClient
  globalForPrisma.prismaSchemaRefreshAttempted = !hasCurrentSchema(nextClient)

  return nextClient
}

function createPrismaClientProxy(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
      const client = getPrismaClient() as unknown as Record<PropertyKey, unknown>
      const value = Reflect.get(client, prop, receiver)
      return typeof value === "function" ? value.bind(client) : value
    },
  })
}

/**
 * Singleton Prisma Client instance.
 *
 * This module caches the client on `globalThis` so repeated imports and
 * server-side calls reuse one process-wide instance in both development and
 * production. When hot reloading preserves a client with an outdated generated
 * schema shape, `getPrismaClient()` refreshes the cached client once.
 *
 * @see {@link https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances}
 */
export const prisma = createPrismaClientProxy()
