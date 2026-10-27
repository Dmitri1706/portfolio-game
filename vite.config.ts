import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

/**
 * Подставляет из content/settings.json адрес сайта ("siteUrl") в мета-теги превью для соцсетей
 * и подпись под именем ("role") — на экран загрузки и в описание страницы.
 * Telegram и соцсети требуют полный адрес картинки, например https://name.github.io/portfolio/og-image.png
 */
function siteUrl(): Plugin {
  return {
    name: 'site-url',
    transformIndexHtml(html) {
      let url = '';
      let role = 'Product / Маркетолог';
      try {
        const s = JSON.parse(readFileSync(resolve(root, 'content/settings.json'), 'utf8'));
        url = s.siteUrl ?? '';
        role = s.role ?? role;
      } catch {
        // без адреса превью останется с относительной ссылкой
      }
      if (url && !url.endsWith('/')) url += '/';
      return html.replaceAll('%SITE_URL%', url).replaceAll('%ROLE%', role);
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
