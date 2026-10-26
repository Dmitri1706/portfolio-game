import { defineConfig } from 'vite';

export default defineConfig({
  // Относительный base: сайт работает и локально, и на GitHub Pages в подпапке.
  base: './',
  server: { host: true },
  // Phaser сам по себе весит ~1.2 МБ — это нормально, предупреждение не нужно
  build: { assetsInlineLimit: 0, chunkSizeWarningLimit: 1600 },
});
