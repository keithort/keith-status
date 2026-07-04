import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mirror tsconfig's "@/*" → "./*" so page-level tests can import app code.
    alias: { '@': path.resolve(import.meta.dirname) },
  },
  test: {
    environment: 'node',
  },
});
