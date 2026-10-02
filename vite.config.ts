import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/battleship-ai/',
  test: {
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
  },
});
