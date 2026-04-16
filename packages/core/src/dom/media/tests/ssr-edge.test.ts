// @vitest-environment edge-runtime
// @ts-expect-error -- Node API available in vitest runner
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8'));

describe('Edge SSR safety', () => {
  it('HlsMedia', async () => {
    const { HlsMedia } = await import('../hls/server');
    const media = new HlsMedia();
    expect(media.engine).toBeNull();
    expect(media.src).toBe('');
    expect(() => media.load()).toThrow('HlsMedia.load() was called on the server');
    expect(() => media.destroy()).toThrow('HlsMedia.destroy() was called on the server');
  });

  it('DashMedia', async () => {
    const { DashMedia } = await import('../dash/server');
    const media = new DashMedia();
    expect(media.engine).toBeNull();
    expect(media.src).toBe('');
    expect(() => media.destroy()).toThrow('DashMedia.destroy() was called on the server');
  });

  it('MuxVideoMedia', async () => {
    const { MuxVideoMedia } = await import('../mux/server');
    const media = new MuxVideoMedia();
    expect(media.engine).toBeNull();
    expect(() => media.load()).toThrow('HlsMedia.load() was called on the server');
    expect(() => media.destroy()).toThrow('HlsMedia.destroy() was called on the server');
  });

  it('MuxAudioMedia', async () => {
    const { MuxAudioMedia } = await import('../mux/server');
    const media = new MuxAudioMedia();
    expect(media.engine).toBeNull();
    expect(() => media.load()).toThrow('HlsMedia.load() was called on the server');
    expect(() => media.destroy()).toThrow('HlsMedia.destroy() was called on the server');
  });

  it('NativeHlsMedia', async () => {
    const { NativeHlsMedia } = await import('../native-hls/server');
    const media = new NativeHlsMedia();
    expect(media.engine).toBeNull();
    expect(() => media.destroy()).toThrow('NativeHlsMedia.destroy() was called on the server');
  });

  it('SimpleHlsMedia', async () => {
    const { SimpleHlsMedia } = await import('../simple-hls/server');
    const media = new SimpleHlsMedia();
    expect(media.engine).toBeNull();
    expect(() => media.destroy()).toThrow('SimpleHlsMedia.destroy() was called on the server');
  });

  it('CustomMediaElement', async () => {
    const { CustomMediaElement } = await import('../custom-media-element/server');
    const TestElement = CustomMediaElement('video', class {} as any);
    expect(TestElement).toBeDefined();
  });

  // Iterate package.json exports with browser/default split
  for (const [key, value] of Object.entries(pkg.exports as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null || !('browser' in value)) continue;
    if (key.includes('*') || key.endsWith('.css')) continue;
    const specifier = key === '.' ? pkg.name : `${pkg.name}/${key.slice(2)}`;
    it(specifier, async () => {
      const mod = await import(specifier);
      expect(mod).toBeDefined();
    });
  }
});
