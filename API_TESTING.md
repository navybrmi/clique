# API Route Testing with Jest

This example demonstrates **Option 2** approach for testing Next.js API routes using Jest with mocked dependencies (simpler than full supertest HTTP server approach).

## Setup Complete

### 1. Dependencies Installed
```bash
npm install --save-dev supertest @types/supertest
```

### 2. Files Created

#### `jest.integration.config.js`
Separate Jest configuration for API route tests:
- Uses `node` test environment (not jsdom)
- Excludes component tests
- Targets `src/app/api/**` files
- Coverage threshold: 70% (adjustable)

#### `src/app/api/categories/__tests__/route.test.ts`
Example integration test for the categories route with 5 test cases:
1. Returns all active categories
2. Returns empty array when no categories exist
3. Handles database errors gracefully
4. Only returns active categories (verifies filter)
5. Returns categories in alphabetical order (verifies sort)

### 3. Test Scripts Added to `package.json`
```json
{
  "test:integration": "jest --config jest.integration.config.js",
  "test:integration:watch": "jest --config jest.integration.config.js --watch",
  "test:integration:coverage": "jest --config jest.integration.config.js --coverage"
}
```

### 4. Response.json() Polyfill Added
Updated `jest.setup.js` with `Response.json()` static method to support NextResponse.json() calls.

## How It Works

### Direct Route Handler Testing
Instead of creating an HTTP server, we:
1. Import the route handler function directly (`GET`, `POST`, etc.)
2. Call it with any required arguments
3. Test the Response object it returns
4. Mock Prisma client to control database responses

### Example Test Structure
```typescript
import { GET } from "../route"
import { prisma } from "@/lib/prisma"

// Mock the Prisma client
jest.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
    },
  },
}))

describe("GET /api/categories", () => {
  it("should return all active categories", async () => {
    // Arrange - Set up mock data
    const mockCategories = [...]
    ;(prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories)

    // Act - Call the route handler
    const response = await GET()
    const data = await response.json()

    // Assert - Verify the response
    expect(response.status).toBe(200)
    expect(data).toHaveLength(3)
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: "asc" },
    })
  })
})
```

## Running Tests

```bash
# Run integration tests once
npm run test:integration

# Run in watch mode (auto-rerun on file changes)
npm run test:integration:watch

# Run with coverage report
npm run test:integration:coverage
```

## Current Test Results

✅ **All 60 tests passing** across 7 API route test suites:
- Categories: 5 tests, 100% coverage
- Movies search: 8 tests, 92% coverage
- Movies by ID: 6 tests, 91.66% coverage
- Restaurants search: 9 tests, 96.29% coverage
- Restaurants by ID: 8 tests, 100% coverage
- Recommendations: 9 tests, 78.37% coverage
- Recommendations by ID: 15 tests, 90.9% coverage

**Overall API Coverage: 89.1% statements, 77.38% branches, 100% functions**

## Next Steps

All 7 main API routes now have comprehensive test coverage! 

### Optional Enhancements:

1. **Increase Recommendations Coverage** (currently 78.37%)
   - Add tests for category-specific data creation (FASHION, HOUSEHOLD, OTHER)
   - Test edge cases in entity creation logic
   - Would bring coverage to ~85%+

2. **Test Auth Route** (currently 0% coverage)
   - `src/app/api/auth/[...nextauth]/route.ts`
   - NextAuth handler - may require special testing approach
   
3. **Add E2E Tests**
   - Use Playwright or Cypress
   - Test full user flows including API interactions
   - Complement unit tests with real browser testing

## Key Benefits of This Approach

1. **Fast** - No HTTP server overhead, direct function calls
2. **Simple** - Fewer dependencies than full supertest approach
3. **Isolated** - Mock Prisma, no real database needed
4. **Focused** - Tests business logic, not HTTP stack
5. **Maintainable** - Easy to understand and modify tests

## Comparison: This Approach vs Full Supertest

| Aspect | This Approach | Full Supertest |
|--------|--------------|----------------|
| Speed | ⚡ Very Fast | 🐢 Slower (server startup) |
| Setup | ✅ Simple | ⚠️ Complex |
| HTTP Testing | ❌ No | ✅ Yes |
| Integration | Unit-like | True Integration |
| Best For | Business logic | Full stack validation |

## Recommendation

- **Start with this approach** - It's working now and covers most needs
- **Add supertest later** if you need to test:
  - HTTP headers/cookies in detail
  - Request parsing edge cases
  - Full Next.js middleware integration
  - Authentication flow end-to-end

## Coverage Goals

Currently at **89.1% overall** with all 7 main routes tested!

**Breakdown by route:**
- Categories: 100% (perfect coverage)
- Restaurants by ID: 100% (perfect coverage)
- Restaurants search: 96.29%
- Movies search: 92%
- Movies by ID: 91.66%
- Recommendations by ID: 90.9%
- Recommendations: 78.37%

The coverage threshold is set to 80% statements, 70% branches, 100% functions, and we're exceeding all targets!
