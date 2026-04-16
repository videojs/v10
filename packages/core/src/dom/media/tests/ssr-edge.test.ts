// @vitest-environment edge-runtime
import { describe, expect, it } from 'vitest';

describe('Edge SSR safety', () => {
  it('HlsMedia', async () => {
    const { HlsMedia } = await import('../hls/server');
    const media = new HlsMedia();
    expect(media.engine).toBeNull();
    expect(media.src).toBe('');
  });

  it('DashMedia', async () => {
    const { DashMedia } = await import('../dash/server');
    const media = new DashMedia();
    expect(media.engine).toBeNull();
    expect(media.src).toBe('');
  });

  it('MuxVideoMedia', async () => {
    const { MuxVideoMedia } = await import('../mux/server');
    const media = new MuxVideoMedia();
    expect(media.engine).toBeNull();
  });

  it('MuxAudioMedia', async () => {
    const { MuxAudioMedia } = await import('../mux/server');
    const media = new MuxAudioMedia();
    expect(media.engine).toBeNull();
  });

  it('NativeHlsMedia', async () => {
    const { NativeHlsMedia } = await import('../native-hls/server');
    const media = new NativeHlsMedia();
    expect(media.engine).toBeNull();
  });

  it('SimpleHlsMedia', async () => {
    const { SimpleHlsMedia } = await import('../simple-hls/server');
    const media = new SimpleHlsMedia();
    expect(media.engine).toBeNull();
  });

  it('CustomMediaElement', async () => {
    const { CustomMediaElement } = await import('../custom-media-element/server');
    const TestElement = CustomMediaElement('video', class {} as any);
    expect(TestElement).toBeDefined();
  });
});
