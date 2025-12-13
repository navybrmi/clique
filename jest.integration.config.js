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
  ],
  collectCoverageFrom: [
    'src/app/api/**/*.{js,jsx,ts,tsx}',
    '!src/app/api/**/_*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageDirectory: 'coverage-integration',
  coverageReporters: ['text', 'lcov', 'json-summary'],
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
