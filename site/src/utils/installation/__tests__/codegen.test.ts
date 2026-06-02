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

  it('accepts any renderer regardless of use case', () => {
    expect(validateInstallationOptions({ ...baseHTML, useCase: 'default-audio', renderer: 'hls' })).toEqual({
      valid: true,
    });
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
  it('returns ejected HTML, JS imports, and CSS for npm install', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, embedMethod: 'ejected' });
    expect(result.js).toBeDefined();
    expect(result.js).toContain("import '@videojs/html/video/player'");
    expect(result.css).toBeDefined();
    expect(result.html).toBeTruthy();
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('<link rel="stylesheet"');
  });

  it('returns ejected HTML with CDN scripts and no JS section for CDN install', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, installMethod: 'cdn', embedMethod: 'ejected' });
    expect(result.js).toBeUndefined();
    expect(result.css).toBeDefined();
    expect(result.html).toContain('cdn.jsdelivr.net');
    expect(result.html).not.toContain('./player.css');
    expect(result.html).toContain('./skin.css');
  });

  it('adds HLS media script to ejected CDN HTML for HLS renderer', () => {
    const result = generateHTMLUsageCode({
      ...baseHTML,
      installMethod: 'cdn',
      embedMethod: 'ejected',
      renderer: 'hls',
    });
    expect(result.html).toContain('media/hls-video.js');
  });

  it('injects custom sourceUrl into ejected HTML media element', () => {
    const result = generateHTMLUsageCode({
      ...baseHTML,
      embedMethod: 'ejected',
      sourceUrl: 'https://example.com/custom.mp4',
    });
    expect(result.html).toContain('src="https://example.com/custom.mp4"');
  });

  it('uses default demo URL in ejected HTML when sourceUrl is empty', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, embedMethod: 'ejected', sourceUrl: '' });
    expect(result.html).toContain('stream.mux.com');
  });

  it('uses HLS demo URL and hls-video element in ejected HTML for HLS renderer', () => {
    const result = generateHTMLUsageCode({
      ...baseHTML,
      embedMethod: 'ejected',
      renderer: 'hls',
      sourceUrl: '',
    });
    expect(result.html).toContain('.m3u8');
    expect(result.html).toContain('<hls-video');
    expect(result.html).not.toContain('<video ');
  });

  it('falls back to packaged for background-video even when ejected is requested', () => {
    const result = generateHTMLUsageCode({
      ...baseHTML,
      useCase: 'background-video',
      renderer: 'background-video',
      embedMethod: 'ejected',
    });
    expect(result.html).toContain('<background-video-player>');
    expect(result.css).toBeUndefined();
  });

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
  it('replaces MyPlayer.tsx with the ejected player when ejected, no Skin.tsx', () => {
    const result = generateReactCreateCode({ ...baseReact, embedMethod: 'ejected' });
    // The ejected TSX is the full self-contained player — no separate Skin.tsx.
    expect(result['MyPlayer.tsx']).toBeDefined();
    expect(result['Skin.tsx']).toBeUndefined();
    expect(result['skin.css']).toBeDefined();
  });

  it('ejected MyPlayer.tsx exports MyPlayer as alias for the ejected component', () => {
    const result = generateReactCreateCode({ ...baseReact, embedMethod: 'ejected' });
    expect(result['MyPlayer.tsx']).toContain('export { VideoPlayer as MyPlayer }');
  });

  it('ejected MyPlayer.tsx imports skin.css not player.css', () => {
    const result = generateReactCreateCode({ ...baseReact, embedMethod: 'ejected' });
    expect(result['MyPlayer.tsx']).toContain("import './skin.css'");
    expect(result['MyPlayer.tsx']).not.toContain("import './player.css'");
  });

  it('ejected MyPlayer.tsx for audio exports AudioPlayer as MyPlayer', () => {
    const result = generateReactCreateCode({
      ...baseReact,
      useCase: 'default-audio',
      skin: 'audio',
      renderer: 'html5-audio',
      embedMethod: 'ejected',
    });
    expect(result['MyPlayer.tsx']).toContain('export { AudioPlayer as MyPlayer }');
  });

  it('falls back to packaged for background-video even when ejected is requested', () => {
    const result = generateReactCreateCode({
      ...baseReact,
      useCase: 'background-video',
      renderer: 'background-video',
      embedMethod: 'ejected',
    });
    expect(result['MyPlayer.tsx']).toBeDefined();
    expect(result['Skin.tsx']).toBeUndefined();
    expect(result['skin.css']).toBeUndefined();
  });

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
