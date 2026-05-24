module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/.claude/',
    '<rootDir>/.claire/',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/.claude/',
    '<rootDir>/.claire/',
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/.claude/',
    '<rootDir>/.claire/',
  ],
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.expo/**',
    '!**/coverage/**',
  ],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/?(*.)+(spec|test).(ts|tsx|js)',
  ],
  coverageReporters: ['lcov', 'text'],
};
