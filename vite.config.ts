import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Content Security Policy (PLAN Section 30). Injected only into the production
// build so it never breaks Vite dev's inline HMR scripts. Static site, no
// backend: default to 'self'; allow the CoinGecko origin for the optional
// live-price overlay; 'unsafe-inline' styles are required by React/xyflow's
// inline style attributes (a static site has no script-injection sink here —
// import is the only untrusted input and is Zod-validated, PLAN Section 30).
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://api.coingecko.com",
  "script-src 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

// VITE_BASE is set to /holdings-hub/ in the Pages deploy workflow; defaults to /
// for local dev and CI builds.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), cspPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**', 'src/schemas/**', 'src/persistence/**'],
    },
  },
});
