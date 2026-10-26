import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Подставляет адрес сайта (content/settings.json → "siteUrl") в мета-теги превью для соцсетей.
 * Telegram и соцсети требуют полный адрес картинки, например https://name.github.io/portfolio/og-image.png
 */
function siteUrl(): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml(html) {
      let url = '';
      try {
        url = JSON.parse(readFileSync(resolve(root, 'content/settings.json'), 'utf8')).siteUrl ?? '';
      } catch {
        // без адреса превью останется с относительной ссылкой
      }
      if (url && !url.endsWith('/')) url += '/';
      return html.replaceAll('%SITE_URL%', url);
    },
  };
}

export default defineConfig({
  // Относительный base: сайт работает и локально, и на GitHub Pages в подпапке.
  base: './',
  server: { host: true },
  plugins: [siteUrl()],
  build: {
    assetsInlineLimit: 0,
    // Phaser сам по себе весит ~1.2 МБ — это нормально, предупреждение не нужно
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      input: {
        main: resolve(root, 'index.html'),
        quick: resolve(root, 'quick.html'),
      },
    },
  },
});
