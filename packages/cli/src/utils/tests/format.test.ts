import { describe, expect, it } from 'vite-plus/test';

import type { InstallationOptions } from '@/utils/installation/codegen';

import {
  formatCdnInstallation,
  formatInstallationCode,
  formatShadcnInstallation,
  formatSvelteInstallation,
  formatVueInstallation,
} from '../format.js';

const baseHTML: InstallationOptions = {
  framework: 'html',
  useCase: 'default-video',
  skin: 'video',
  renderer: 'html5-video',
  sourceUrl: '',
  installMethod: 'npm',
};

const baseReact: InstallationOptions = {
  framework: 'react',
  useCase: 'default-video',
  skin: 'video',
  renderer: 'html5-video',
  sourceUrl: '',
  installMethod: 'npm',
};

describe('formatInstallationCode', () => {
  it('formats HTML + npm with install, TypeScript imports, and HTML sections', () => {
    const result = formatInstallationCode(baseHTML);

    expect(result).toContain('## Install Video.js');
    expect(result).toContain('npm install @videojs/html');
    expect(result).toContain('## TypeScript imports');
    expect(result).toContain('```ts');
    expect(result).toContain('## HTML');
    expect(result).toContain('<video-player>');
  });

  it('formats HTML + CDN without TypeScript imports section', () => {
    const result = formatInstallationCode({ ...baseHTML, installMethod: 'cdn' });

    expect(result).toContain('## Install Video.js');
    expect(result).toContain('<script');
    expect(result).not.toContain('## TypeScript imports');
    expect(result).toContain('## HTML');
  });

  it('formats React with install and add-player sections', () => {
    const result = formatInstallationCode(baseReact);

    expect(result).toContain('## Install Video.js');
    expect(result).toContain('npm install @videojs/react');
    expect(result).toContain('## Add your player');
    expect(result).toContain('Add to `app/page.tsx`');
    expect(result).toContain('export default function Page()');
    expect(result).not.toContain('MyPlayer');
    expect(result.match(/```tsx/g)).toHaveLength(1);
  });

  it('uses pnpm install command when specified', () => {
    const result = formatInstallationCode({ ...baseReact, installMethod: 'pnpm' });

    expect(result).toContain('pnpm add @videojs/react');
  });

  it('formats HTML with skin none — omits skin tag and skin import', () => {
    const result = formatInstallationCode({ ...baseHTML, skin: 'none' });

    expect(result).toContain('<video-player>');
    expect(result).not.toContain('<video-skin>');
    expect(result).not.toContain("'@videojs/html/video/skin'");
  });

  it('formats the HTML live-video preset', () => {
    const result = formatInstallationCode({ ...baseHTML, useCase: 'live-video', renderer: 'hls' });

    expect(result).toContain('npm install @videojs/html @videojs/hlsjs-video');
    expect(result).toContain('<live-video-player>');
    expect(result).toContain("import '@videojs/html/live-video/skin'");
  });

  it('formats the React live-audio preset', () => {
    const result = formatInstallationCode({
      ...baseReact,
      useCase: 'live-audio',
      skin: 'audio',
      renderer: 'mux-audio',
    });

    expect(result).toContain('npm install @videojs/react @videojs/mux-audio');
    expect(result).toContain('<LiveAudioPlayer>');
    expect(result).toContain('<LiveAudioSkin>');
  });
});

describe('framework installation formats', () => {
  it('formats a dedicated CDN guide', () => {
    const result = formatCdnInstallation({ ...baseHTML, installMethod: 'cdn' });

    expect(result).toContain('## Load Video.js');
    expect(result).toContain('<script type="module"');
    expect(result).toContain('## Add your player');
  });

  it('formats Vue configuration, component, and usage', () => {
    const result = formatVueInstallation({ ...baseHTML, installMethod: 'pnpm' });

    expect(result).toContain('pnpm add @videojs/html');
    expect(result).toContain('vite.config.ts');
    expect(result).toContain('nuxt.config.ts');
    expect(result).toContain('components/VideoPlayer.vue');
    expect(result).toContain('App.vue');
  });

  it('formats Svelte and SvelteKit usage', () => {
    const result = formatSvelteInstallation({ ...baseHTML, installMethod: 'bun' });

    expect(result).toContain('bun add @videojs/html');
    expect(result).toContain('src/lib/VideoPlayer.svelte');
    expect(result).toContain('src/routes/+page.svelte');
    expect(result).toContain('src/App.svelte');
  });

  it('formats Shadcn initialization, registry commands, and local React source', () => {
    const result = formatShadcnInstallation(baseReact, {
      framework: 'react',
      runner: 'pnpm',
      styling: 'tailwind',
      template: 'next',
    });

    expect(result).toContain('pnpm dlx shadcn@latest init --template next');
    expect(result).toContain('pnpm dlx shadcn@latest add @videojs/video');
    expect(result).toContain("from '@/components/videojs/video/skin'");
  });

  it('includes an adapter command and HTML source steps when needed', () => {
    const result = formatShadcnInstallation(
      { ...baseHTML, renderer: 'hls', installMethod: 'yarn' },
      { framework: 'html', runner: 'yarn', styling: 'css', template: 'vite' }
    );

    expect(result).toContain('yarn add @videojs/hlsjs-video');
    expect(result).toContain('components/videojs/video/skin.html');
    expect(result).toContain("import '@videojs/html/media/hlsjs-video'");
  });
});
