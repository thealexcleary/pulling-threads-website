import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pullingthreads.com.au',
  output: 'static',
  integrations: [sitemap()],
});
