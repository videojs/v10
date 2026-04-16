import { describe, expect, it } from 'vitest';

describe('SSR safety', () => {
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
});
