module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/service-worker.js',
    '!src/app.js',
  ],
  moduleFileExtensions: ['js', 'json'],
  transform: {},
  testTimeout: 10000,
};
