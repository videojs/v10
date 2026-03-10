// @ts-check

import process from 'node:process';

import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField, fontProviders } from 'astro/config';
import svgr from 'vite-plugin-svgr';
import checkV8Urls from './integrations/check-v8-urls';
import llmsMarkdown from './integrations/llms-markdown';
import pagefind from './integrations/pagefind';
import rehypePrepareCodeBlocks from './src/utils/rehypePrepareCodeBlocks';
import remarkConditionalHeadings from './src/utils/remarkConditionalHeadings';
import { remarkReadingTime } from './src/utils/remarkReadingTime.mjs';
import shikiTransformMetadata from './src/utils/shikiTransformMetadata';

const SITE_URL = 'https://videojs.org';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  adapter: netlify({
    devFeatures: { images: false },
  }),
  // Server-only secrets read at runtime (not inlined at build time).
  // All optional — the site degrades gracefully without auth/Mux configured.
  // See site/CLAUDE.md "Environment Variables" for full documentation.
  env: {
    schema: {
      // OAuth — powers the video uploader login flow
      OAUTH_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      OAUTH_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      OAUTH_REDIRECT_URI: envField.string({ context: 'server', access: 'secret', optional: true }),
      OAUTH_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      SESSION_COOKIE_PASSWORD: envField.string({ context: 'server', access: 'secret', optional: true }),
      MUX_API_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
        default: 'https://api.mux.com',
      }),
      // Mux service account credentials — only used by the /api/health/mux endpoint
      MUX_TOKEN_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      MUX_TOKEN_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  redirects: {
    // Redirects are configured in netlify.toml
  },
  integrations: [
    sentry({
      project: 'videojsorg',
      org: 'mux',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    mdx({ extendMarkdownConfig: true }),
    sitemap({
      // llms-markdown.ts auto-generates per-framework sub-indexes, but sitemap
      // entries are hardcoded here. Add a new line when adding a framework.
      customPages: [
        `${SITE_URL}/llms.txt`,
        `${SITE_URL}/blog/llms.txt`,
        `${SITE_URL}/docs/framework/html/llms.txt`,
        `${SITE_URL}/docs/framework/react/llms.txt`,
      ],
    }),
    pagefind(),
    llmsMarkdown(),
    checkV8Urls(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
  ],
  prefetch: {
    prefetchAll: true,
  },

  markdown: {
    // a lot of these are defaults but I'm setting them just to be explicit
    smartypants: true,
    gfm: true,
    syntaxHighlight: 'shiki',
    shikiConfig: {
      themes: {
        light: 'gruvbox-dark-hard',
        dark: 'gruvbox-dark-soft',
      },
      // TODO more shiki transformers
      transformers: [shikiTransformMetadata],
    },
    remarkPlugins: [remarkConditionalHeadings, remarkReadingTime],
    rehypePlugins: [rehypePrepareCodeBlocks],
  },

  image: {
    domains: ['image.mux.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '66.media.tumblr.com',
        pathname: '/tumblr_mdgad5rr0S1qzc111.png',
      },
    ],
  },

  vite: {
    plugins: [tailwindcss(), svgr()],
    optimizeDeps: {
      exclude: ['@videojs/react', '@videojs/html'],
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },

  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: 'Instrument Sans',
        cssVariable: '--font-instrument-sans',
        weights: ['400 600'],
        styles: ['normal', 'italic'],
        subsets: ['latin'],
        fallbacks: ['sans-serif'],
        optimizedFallbacks: true,
        display: 'swap',
      },
      {
        provider: fontProviders.google(),
        name: 'IBM Plex Mono',
        cssVariable: '--font-ibm-plex-mono',
        weights: ['600', '400'],
        styles: ['normal'],
        subsets: ['latin'],
        fallbacks: ['monospace'],
        optimizedFallbacks: true,
        display: 'swap',
      },
    ],
  },
});
