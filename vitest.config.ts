import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
  oxc: false,
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
})
