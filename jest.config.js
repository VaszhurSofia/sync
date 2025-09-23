module.exports = {
  projects: [
    {
      displayName: 'types',
      testMatch: ['<rootDir>/packages/types/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
    },
    {
      displayName: 'ui',
      testMatch: ['<rootDir>/packages/ui/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/packages/ui/src/test-setup.ts'],
    },
    {
      displayName: 'api',
      testMatch: ['<rootDir>/services/api/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/services/api/src/test-setup.ts'],
    },
    {
      displayName: 'ai',
      testMatch: ['<rootDir>/services/ai/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/services/ai/src/test-setup.ts'],
    },
  ],
  collectCoverageFrom: [
    'packages/**/*.ts',
    'services/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
};
