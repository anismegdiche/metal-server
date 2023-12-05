module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    "**/__tests__/**/*.ts?(x)", 
    "**/?(*.)+(spec|test).ts?(x)",
    "**/client/__tests__/**/*.js"
  ],
  transform: {
    '^.+.ts?$': ['ts-jest', { diagnostics: false }]
  },
  transformIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/'
  ]
};