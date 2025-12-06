import { PrismaClient } from '@prisma/client'

/**
 * Global augmentation for Prisma client instance.
 * Prevents multiple Prisma Client instances in development due to hot reloading.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Singleton Prisma Client instance.
 * 
 * In development, this uses a global variable to prevent creating multiple instances
 * during hot module replacement. In production, a new instance is created.
 * 
 * @see {@link https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prevent-hot-reloading-from-creating-new-instances}
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
