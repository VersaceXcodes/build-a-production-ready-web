module.exports = {
  "testEnvironment": "node",
  "coverageDirectory": "coverage",
  "collectCoverageFrom": [
    "*.js",
    "!node_modules/**",
    "!coverage/**",
    "!jest.config.js"
  ],
  "testMatch": [
    "**/tests/**/*.test.js",
    "**/__tests__/**/*.test.js"
  ],
  "setupFilesAfterEnv": [
    "<rootDir>/tests/setup.js"
  ],
  "testTimeout": 30000,
  "verbose": true,
  "forceExit": true,
  "detectOpenHandles": true,
  "maxWorkers": 1,
  "preset": "ts-jest"
};