import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// One id per build, baked into both the page and /version.json so an open
// tab can tell it's been superseded (see the update banner in
// src/pages/[trip]/index.astro). The commit SHA first, so a content-only
// push still counts as new; the timestamp fallback covers local builds.
// Evaluated once per build process, so the server and client bundles agree.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || String(Date.now());

// output: 'server' is explicit because Astro 5+ defaults to 'static', which the
// Vercel adapter alone does not change (AD-1). Individual routes opt back into
// static prerendering via `export const prerender = true` where needed.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  vite: {
    define: {
      __BUILD_ID__: JSON.stringify(BUILD_ID),
    },
  },
});
