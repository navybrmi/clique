/**
 * Tests for Prisma client singleton and schema refresh behavior.
 */

describe('Prisma client singleton', () => {
  const globalState = globalThis as typeof globalThis & {
    prisma?: unknown
    prismaSchemaRefreshAttempted?: boolean
  }

  const constructorQueue: Array<Record<string, unknown>> = []
  const PrismaClientMock = jest.fn(() => {
    const nextClient = constructorQueue.shift()

    if (!nextClient) {
      throw new Error('No mock Prisma client queued for this test')
    }

    return nextClient
  })

  /**
   * Creates a mock Prisma client with optional clique delegate support.
   *
   * @param options - Controls which schema delegates the mock client exposes
   * @returns Mock Prisma client instance
   */
  function createClient(options?: { hasClique?: boolean }) {
    const hasClique = options?.hasClique ?? true

    return {
      clique: hasClique ? { findMany: jest.fn() } : undefined,
      $disconnect: jest.fn().mockResolvedValue(undefined),
    }
  }

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    constructorQueue.length = 0
    delete globalState.prisma
    delete globalState.prismaSchemaRefreshAttempted

    jest.doMock('@prisma/client', () => ({
      PrismaClient: PrismaClientMock,
    }))
  })

  afterEach(() => {
    delete globalState.prisma
    delete globalState.prismaSchemaRefreshAttempted
  })

  it('reuses the cached client when the current schema delegates are present', async () => {
    const cachedClient = createClient()
    globalState.prisma = cachedClient

    const { prisma, getPrismaClient } = await import('../prisma')

    expect(getPrismaClient()).toBe(cachedClient)
    expect((prisma as unknown as { clique?: unknown }).clique).toBe(cachedClient.clique)
    expect(PrismaClientMock).not.toHaveBeenCalled()
  })

  it('disconnects a stale cached client before replacing it', async () => {
    const staleClient = createClient({ hasClique: false })
    const freshClient = createClient()

    globalState.prisma = staleClient
    constructorQueue.push(freshClient)

    const { prisma, getPrismaClient } = await import('../prisma')

    expect(getPrismaClient()).toBe(freshClient)
    expect((prisma as unknown as { clique?: unknown }).clique).toBe(freshClient.clique)
    expect(staleClient.$disconnect).toHaveBeenCalledTimes(1)
    expect(PrismaClientMock).toHaveBeenCalledTimes(1)
  })

  it('avoids recreating the client on every call when the generated client is still missing delegates', async () => {
    const staleClient = createClient({ hasClique: false })
    const replacementClient = createClient({ hasClique: false })

    globalState.prisma = staleClient
    constructorQueue.push(replacementClient)

    const { prisma, getPrismaClient } = await import('../prisma')

    expect(getPrismaClient()).toBe(replacementClient)
    expect(getPrismaClient()).toBe(replacementClient)
    expect((prisma as unknown as { clique?: unknown }).clique).toBe(
      replacementClient.clique
    )
    expect(staleClient.$disconnect).toHaveBeenCalledTimes(1)
    expect(replacementClient.$disconnect).not.toHaveBeenCalled()
    expect(PrismaClientMock).toHaveBeenCalledTimes(1)
  })

  it("reads the latest cached client through the exported prisma proxy", async () => {
    const firstClient = createClient()
    const replacementClient = createClient()

    globalState.prisma = firstClient

    const { prisma } = await import("../prisma")

    expect((prisma as unknown as { clique?: unknown }).clique).toBe(firstClient.clique)

    globalState.prisma = replacementClient

    expect((prisma as unknown as { clique?: unknown }).clique).toBe(
      replacementClient.clique
    )
  })
})
