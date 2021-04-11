/* eslint-disable @typescript-eslint/no-var-requires */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  rootDir: 'src',
  collectCoverage: true,
  coverageDirectory: require('path').resolve(__dirname, './coverage'),
}
