const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  testEnvironment: 'node', // Use Node.js environment for API route tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  forceExit: true, // Force exit after tests complete to avoid hanging
  detectOpenHandles: false, // Disable open handles detection for cleaner output
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/?(*.)+(test|spec).[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/components/__tests__/', // Exclude component tests
    '<rootDir>/src/app/__tests__/', // Exclude page component tests
    '<rootDir>/src/hooks/__tests__/', // Exclude hook tests (jsdom only)
    'src/app/recommendations/.+/__tests__/', // Exclude page-level unit tests (jsdom only)
    'src/app/auth/.+/__tests__/', // Exclude auth page unit tests (jsdom only)
    'src/app/invite/.+/__tests__/', // Exclude invite page unit tests (jsdom only)
    '<rootDir>/src/app/data-deletion/__tests__/', // Exclude data-deletion page unit tests (jsdom only)
  ],
  collectCoverageFrom: [
    'src/app/api/**/*.{js,jsx,ts,tsx}',
    'src/lib/clique-service.ts',
    '!src/app/api/**/_*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageDirectory: 'coverage-integration',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  reporters: ['default', 'jest-junit'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 100,
      lines: 80,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
