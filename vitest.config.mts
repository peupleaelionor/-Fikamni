import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

// On aligne l'alias « @ » sur celui de tsconfig.json afin que les tests puissent
// importer les modules de `lib/` de la même manière que l'application Next.js.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir
    }
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts']
  }
});
