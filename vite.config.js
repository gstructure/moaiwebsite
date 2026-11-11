import { defineConfig } from 'vite';

// Static single-page build. Output goes to dist/ with content-hashed assets
// (dist/assets/*) that can be cached forever on S3/CloudFront or Amplify.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
  server: { port: 5173, open: false },
  preview: { port: 4173 },
});
