// @ts-check

import process from 'node:process';

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import vercel from '@astrojs/vercel';

import sentry from '@sentry/astro';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import checkV8Urls from './integrations/check-v8-urls';
import llmsMarkdown from './integrations/llms-markdown';
import pagefind from './integrations/pagefind';
import rehypePrepareCodeBlocks from './src/utils/rehypePrepareCodeBlocks';
import remarkConditionalHeadings from './src/utils/remarkConditionalHeadings';
import { remarkReadingTime } from './src/utils/remarkReadingTime.mjs';
import shikiTransformMetadata from './src/utils/shikiTransformMetadata';

const SITE_URL = 'https://v10.videojs.org';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'never',
  adapter: vercel(),
  redirects: {
    // Redirects are configured in vercel.json
  },
  integrations: [
    sentry({
      project: 'videojsorg',
      org: 'mux',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    mdx({ extendMarkdownConfig: true }),
    sitemap({
      customPages: [`${SITE_URL}/llms.txt`],
    }),
    pagefind(),
    llmsMarkdown(),
    checkV8Urls(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '18' }]],
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
        light: 'gruvbox-light-hard',
        dark: 'gruvbox-dark-medium',
      },
      // TODO more shiki transformers
      transformers: [shikiTransformMetadata],
    },
    remarkPlugins: [remarkConditionalHeadings, remarkReadingTime],
    rehypePlugins: [rehypePrepareCodeBlocks],
  },

  image: {
    domains: ['image.mux.com'],
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@vjs/react'],
    },
    resolve: {
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
