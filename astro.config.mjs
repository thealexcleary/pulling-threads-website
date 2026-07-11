import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pullingthreads.com.au',
  output: 'static',
  integrations: [sitemap()],
  // never inline page scripts: the CSP allows only external same-origin scripts
  vite: { build: { assetsInlineLimit: 0 } },
});
