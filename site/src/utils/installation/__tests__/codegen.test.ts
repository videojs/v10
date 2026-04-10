import { describe, expect, it } from 'vitest';
import {
  generateHTMLInstallCode,
  generateHTMLUsageCode,
  generateReactCreateCode,
  generateReactInstallCode,
  generateReactUsageCode,
  type InstallationOptions,
  validateInstallationOptions,
} from '../codegen';

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

describe('validateInstallationOptions', () => {
  it('accepts valid HTML + npm combo', () => {
    expect(validateInstallationOptions(baseHTML)).toEqual({ valid: true });
  });

  it('accepts valid React + npm combo', () => {
    expect(validateInstallationOptions(baseReact)).toEqual({ valid: true });
  });

  it('rejects React + CDN', () => {
    const result = validateInstallationOptions({ ...baseReact, installMethod: 'cdn' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('CDN');
    }
  });

  it('rejects invalid renderer for use case', () => {
    const result = validateInstallationOptions({ ...baseHTML, useCase: 'default-audio', renderer: 'hls' });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('hls');
      expect(result.reason).toContain('default-audio');
    }
  });

  it('accepts HLS for default-video', () => {
    expect(validateInstallationOptions({ ...baseHTML, renderer: 'hls' })).toEqual({ valid: true });
  });

  it('accepts background-video renderer for background-video use case', () => {
    const opts: InstallationOptions = {
      ...baseHTML,
      useCase: 'background-video',
      renderer: 'background-video',
    };
    expect(validateInstallationOptions(opts)).toEqual({ valid: true });
  });
});

describe('generateHTMLInstallCode', () => {
  it('returns install commands for all methods', () => {
    const result = generateHTMLInstallCode(baseHTML);
    expect(result.npm).toBe('npm install @videojs/html');
    expect(result.pnpm).toBe('pnpm add @videojs/html');
    expect(result.yarn).toBe('yarn add @videojs/html');
    expect(result.bun).toBe('bun add @videojs/html');
  });

  it('returns CDN script tags', () => {
    const result = generateHTMLInstallCode(baseHTML);
    expect(result.cdn).toContain('<script');
    expect(result.cdn).toContain('cdn.jsdelivr.net');
  });

  it('includes HLS media script in CDN output', () => {
    const result = generateHTMLInstallCode({ ...baseHTML, renderer: 'hls' });
    expect(result.cdn).toContain('media/hls-video.js');
  });
});

describe('generateReactInstallCode', () => {
  it('returns install commands for all methods', () => {
    const result = generateReactInstallCode();
    expect(result.npm).toBe('npm install @videojs/react');
    expect(result.pnpm).toBe('pnpm add @videojs/react');
    expect(result.yarn).toBe('yarn add @videojs/react');
    expect(result.bun).toBe('bun add @videojs/react');
  });
});

describe('generateHTMLUsageCode', () => {
  it('generates HTML with video-player and video-skin for default video', () => {
    const result = generateHTMLUsageCode(baseHTML);
    expect(result.html).toContain('<video-player>');
    expect(result.html).toContain('<video-skin>');
    expect(result.html).toContain('<video src=');
    expect(result.html).toContain('playsinline');
  });

  it('includes JS imports when not CDN', () => {
    const result = generateHTMLUsageCode(baseHTML);
    expect(result.js).toBeDefined();
    expect(result.js).toContain("import '@videojs/html/video/player'");
    expect(result.js).toContain("import '@videojs/html/video/skin'");
  });

  it('omits JS imports when CDN', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, installMethod: 'cdn' });
    expect(result.js).toBeUndefined();
  });

  it('uses audio tags for audio use case', () => {
    const opts: InstallationOptions = {
      ...baseHTML,
      useCase: 'default-audio',
      skin: 'audio',
      renderer: 'html5-audio',
    };
    const result = generateHTMLUsageCode(opts);
    expect(result.html).toContain('<audio-player>');
    expect(result.html).toContain('<audio-skin>');
    expect(result.html).toContain('<audio src=');
    expect(result.html).not.toContain('playsinline');
  });

  it('uses background-video tags', () => {
    const opts: InstallationOptions = {
      ...baseHTML,
      useCase: 'background-video',
      renderer: 'background-video',
    };
    const result = generateHTMLUsageCode(opts);
    expect(result.html).toContain('<background-video-player>');
    expect(result.html).toContain('<background-video-skin>');
  });

  it('includes HLS media import in JS', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, renderer: 'hls' });
    expect(result.js).toContain("import '@videojs/html/media/hls-video'");
  });

  it('uses minimal skin tag', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, skin: 'minimal-video' });
    expect(result.html).toContain('<video-minimal-skin>');
    expect(result.js).toContain("import '@videojs/html/video/minimal-skin'");
  });

  it('uses custom source URL when provided', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, sourceUrl: 'https://example.com/video.mp4' });
    expect(result.html).toContain('https://example.com/video.mp4');
  });

  it('uses default demo URL when source URL is empty', () => {
    const result = generateHTMLUsageCode(baseHTML);
    expect(result.html).toContain('stream.mux.com');
  });
});

describe('generateReactCreateCode', () => {
  it('generates a React player component for default video', () => {
    const result = generateReactCreateCode(baseReact);
    const code = result['MyPlayer.tsx'];
    expect(code).toContain("'use client'");
    expect(code).toContain('createPlayer');
    expect(code).toContain('videoFeatures');
    expect(code).toContain('<VideoSkin>');
    expect(code).toContain('<Video src={src} playsInline />');
    expect(code).toContain("from '@videojs/react/video'");
    expect(code).toContain("import '@videojs/react/video/skin.css'");
  });

  it('uses separate media import for HLS', () => {
    const result = generateReactCreateCode({ ...baseReact, renderer: 'hls' });
    const code = result['MyPlayer.tsx'];
    expect(code).toContain("import { VideoSkin } from '@videojs/react/video'");
    expect(code).toContain("import { HlsVideo } from '@videojs/react/media/hls-video'");
    expect(code).toContain('<HlsVideo src={src} playsInline />');
  });

  it('uses audio features and components', () => {
    const opts: InstallationOptions = {
      ...baseReact,
      useCase: 'default-audio',
      skin: 'audio',
      renderer: 'html5-audio',
    };
    const result = generateReactCreateCode(opts);
    const code = result['MyPlayer.tsx'];
    expect(code).toContain('audioFeatures');
    expect(code).toContain('<AudioSkin>');
    expect(code).toContain('<Audio src={src} />');
    expect(code).not.toContain('playsInline');
  });

  it('uses minimal skin component', () => {
    const result = generateReactCreateCode({ ...baseReact, skin: 'minimal-video' });
    const code = result['MyPlayer.tsx'];
    expect(code).toContain('<MinimalVideoSkin>');
    expect(code).toContain("import '@videojs/react/video/minimal-skin.css'");
  });

  it('uses background video components', () => {
    const opts: InstallationOptions = {
      ...baseReact,
      useCase: 'background-video',
      renderer: 'background-video',
    };
    const result = generateReactCreateCode(opts);
    const code = result['MyPlayer.tsx'];
    expect(code).toContain('backgroundFeatures');
    expect(code).toContain('<BackgroundVideoSkin>');
    expect(code).toContain('<BackgroundVideo');
    expect(code).toContain("import '@videojs/react/background/skin.css'");
  });
});

describe('generateReactUsageCode', () => {
  it('generates usage code with default URL', () => {
    const result = generateReactUsageCode(baseReact);
    const code = result['App.tsx'];
    expect(code).toContain("import { MyPlayer } from '../components/player'");
    expect(code).toContain('<MyPlayer src=');
    expect(code).toContain('stream.mux.com');
  });

  it('uses HLS URL for HLS renderer', () => {
    const result = generateReactUsageCode({ ...baseReact, renderer: 'hls' });
    const code = result['App.tsx'];
    expect(code).toContain('.m3u8');
  });

  it('uses custom source URL', () => {
    const result = generateReactUsageCode({ ...baseReact, sourceUrl: 'https://example.com/stream.m3u8' });
    const code = result['App.tsx'];
    expect(code).toContain('https://example.com/stream.m3u8');
  });
});
