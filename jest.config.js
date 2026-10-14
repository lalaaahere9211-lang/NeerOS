module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        moduleResolution: 'node',
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-url-polyfill(.*)$': '<rootDir>/src/domain/__tests__/__mocks__/emptyMock.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/domain/__tests__/__mocks__/emptyMock.js',
    '^react-native$': '<rootDir>/src/domain/__tests__/__mocks__/reactNativeMock.js',
  }
};
