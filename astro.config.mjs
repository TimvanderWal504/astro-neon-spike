import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// output: 'server' is explicit because Astro 5+ defaults to 'static', which the
// Vercel adapter alone does not change (AD-1). Individual routes opt back into
// static prerendering via `export const prerender = true` where needed.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
});
