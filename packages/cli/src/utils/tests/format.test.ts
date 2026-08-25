import { describe, expect, it } from 'vite-plus/test';

import type { InstallationOptions } from '@/utils/installation/codegen';

import { formatInstallationCode } from '../format.js';

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

  it('formats React with install, create, and use sections', () => {
    const result = formatInstallationCode(baseReact);

    expect(result).toContain('## Install Video.js');
    expect(result).toContain('npm install @videojs/react');
    expect(result).toContain('## Create your player');
    expect(result).toContain('MyPlayer');
    expect(result).toContain('## Use your player');
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

    expect(result).toContain('<LiveAudioPlayer>');
    expect(result).toContain('<LiveAudioSkin>');
  });
});
