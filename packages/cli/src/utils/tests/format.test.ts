import { describe, expect, it } from 'vitest';
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
  it('formats HTML + npm with install, JS imports, and HTML sections', () => {
    const result = formatInstallationCode(baseHTML);
    expect(result).toContain('## Install Video.js');
    expect(result).toContain('npm install @videojs/html');
    expect(result).toContain('## JavaScript imports');
    expect(result).toContain('## HTML');
    expect(result).toContain('<video-player>');
  });

  it('formats HTML + CDN without JS imports section', () => {
    const result = formatInstallationCode({ ...baseHTML, installMethod: 'cdn' });
    expect(result).toContain('## Install Video.js');
    expect(result).toContain('<script');
    expect(result).not.toContain('## JavaScript imports');
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

  it('formats ejected HTML with install, HTML block, and skin.css sub-section', () => {
    const result = formatInstallationCode({ ...baseHTML, embedMethod: 'ejected' });
    expect(result).toContain('## Install Video.js');
    expect(result).toContain('npm install @videojs/html');
    expect(result).toContain('## HTML');
    expect(result).toContain('### skin.css');
    expect(result).not.toContain('## Your skin');
    // Ejected has no separate JS imports section (CDN scripts are embedded in the HTML)
    expect(result).not.toContain('## JavaScript imports');
  });

  it('formats ejected React with install, multi-file create, and use sections', () => {
    const result = formatInstallationCode({ ...baseReact, embedMethod: 'ejected' });
    expect(result).toContain('## Install Video.js');
    expect(result).toContain('npm install @videojs/react');
    expect(result).toContain('## Create your player');
    expect(result).toContain('index.tsx');
    expect(result).toContain('Skin.tsx');
    expect(result).toContain('skin.css');
    expect(result).toContain('## Use your player');
    expect(result).not.toContain('## Your skin');
  });

  it('falls back to packaged for background-video even when ejected is requested', () => {
    const result = formatInstallationCode({
      ...baseHTML,
      useCase: 'background-video',
      renderer: 'background-video',
      embedMethod: 'ejected',
    });
    expect(result).toContain('## HTML');
    expect(result).toContain('<background-video-player>');
    expect(result).not.toContain('## Your skin');
    expect(result).not.toContain('### skin.css');
  });
});
