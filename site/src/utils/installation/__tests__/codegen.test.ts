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
  const manifest = ['hlsjs-video', 'dash-video', 'mux-video', 'mux-audio'];

  it('returns install commands for all methods', () => {
    const result = generateHTMLInstallCode(baseHTML, manifest);
    expect(result.npm).toBe('npm install @videojs/html');
    expect(result.pnpm).toBe('pnpm add @videojs/html');
    expect(result.yarn).toBe('yarn add @videojs/html');
    expect(result.bun).toBe('bun add @videojs/html');
  });

  it('returns CDN script tags', () => {
    const result = generateHTMLInstallCode(baseHTML, manifest);
    expect(result.cdn).toContain('<script');
    expect(result.cdn).toContain('cdn.jsdelivr.net');
  });

  it('includes HLS media script in CDN output', () => {
    const result = generateHTMLInstallCode({ ...baseHTML, renderer: 'hls' }, manifest);
    expect(result.cdn).toContain('media/hlsjs-video.js');
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
    expect(result.js).toContain("import '@videojs/html/media/hlsjs-video'");
  });

  it('uses the dash-video tag, playsinline, and media import for DASH', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, renderer: 'dash' });
    expect(result.html).toContain('<dash-video src=');
    expect(result.html).toContain('playsinline');
    expect(result.html).toContain('.mpd');
    expect(result.js).toContain("import '@videojs/html/media/dash-video'");
  });

  it('uses the mux-video tag, playsinline, and media import for Mux video', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, renderer: 'mux-video' });
    expect(result.html).toContain('<mux-video src=');
    expect(result.html).toContain('playsinline');
    expect(result.js).toContain("import '@videojs/html/media/mux-video'");
  });

  it('uses the vimeo-video tag and media import, without playsinline (iframe)', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, renderer: 'vimeo' });
    expect(result.html).toContain('<vimeo-video src=');
    expect(result.html).not.toContain('playsinline');
    expect(result.html).toContain('vimeo.com');
    expect(result.js).toContain("import '@videojs/html/media/vimeo-video'");
  });

  it('uses the mux-audio tag without playsinline for the audio use case', () => {
    const result = generateHTMLUsageCode({
      ...baseHTML,
      useCase: 'default-audio',
      skin: 'audio',
      renderer: 'mux-audio',
    });
    expect(result.html).toContain('<mux-audio src=');
    expect(result.html).not.toContain('playsinline');
    expect(result.js).toContain("import '@videojs/html/media/mux-audio'");
  });

  it('uses minimal skin tag', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, skin: 'minimal-video' });
    expect(result.html).toContain('<video-minimal-skin>');
    expect(result.js).toContain("import '@videojs/html/video/minimal-skin'");
  });

  it('omits skin tag and skin import when skin is none', () => {
    const result = generateHTMLUsageCode({ ...baseHTML, skin: 'none' });
    expect(result.html).toContain('<video-player>');
    expect(result.html).not.toContain('<video-skin>');
    expect(result.js).toContain("import '@videojs/html/video/player'");
    expect(result.js).not.toContain("import '@videojs/html/video/skin'");
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
    expect(code).toContain("import { HlsJsVideo } from '@videojs/react/media/hlsjs-video'");
    expect(code).toContain('<HlsJsVideo src={src} playsInline />');
  });

  it('uses separate media import for DASH', () => {
    const result = generateReactCreateCode({ ...baseReact, renderer: 'dash' });
    const code = result['MyPlayer.tsx'];
    expect(code).toContain("import { DashVideo } from '@videojs/react/media/dash-video'");
    expect(code).toContain('<DashVideo src={src} playsInline />');
  });

  it('uses separate media import for Mux video', () => {
    const result = generateReactCreateCode({ ...baseReact, renderer: 'mux-video' });
    const code = result['MyPlayer.tsx'];
    expect(code).toContain("import { MuxVideo } from '@videojs/react/media/mux-video'");
    expect(code).toContain('<MuxVideo src={src} playsInline />');
  });

  it('uses separate media import for Vimeo without playsInline (iframe)', () => {
    const result = generateReactCreateCode({ ...baseReact, renderer: 'vimeo' });
    const code = result['MyPlayer.tsx'];
    expect(code).toContain("import { VimeoVideo } from '@videojs/react/media/vimeo-video'");
    expect(code).toContain('<VimeoVideo src={src} />');
    expect(code).not.toContain('playsInline');
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

  it('omits skin component and CSS import when skin is none', () => {
    const result = generateReactCreateCode({ ...baseReact, skin: 'none' });
    const code = result['MyPlayer.tsx'];
    expect(code).not.toContain('VideoSkin');
    expect(code).not.toContain('skin.css');
    expect(code).toContain('<Video src={src} playsInline />');
    expect(code).toContain("from '@videojs/react/video'");
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
