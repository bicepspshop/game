const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Укажите путь к вашему Next.js приложению
  dir: './',
});

// Любая пользовательская конфигурация Jest, которую вы хотите добавить
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

// createJestConfig экспортирует эту конфигурацию для использования с NextJS
module.exports = createJestConfig(customJestConfig);
