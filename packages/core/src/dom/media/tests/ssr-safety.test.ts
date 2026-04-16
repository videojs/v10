import { describe, expect, it } from 'vitest';

describe('SSR safety', () => {
  describe('HlsMedia (server)', () => {
    it('should import without crashing', async () => {
      const mod = await import('../hls/server');
      expect(mod.HlsMedia).toBeDefined();
    });

    it('should construct without crashing', async () => {
      const { HlsMedia } = await import('../hls/server');
      const media = new HlsMedia();
      expect(media.engine).toBeNull();
      expect(media.error).toBeNull();
      expect(media.src).toBe('');
    });
  });

  describe('DashMedia (server)', () => {
    it('should import without crashing', async () => {
      const mod = await import('../dash/server');
      expect(mod.DashMedia).toBeDefined();
    });

    it('should construct without crashing', async () => {
      const { DashMedia } = await import('../dash/server');
      const media = new DashMedia();
      expect(media.engine).toBeNull();
      expect(media.src).toBe('');
    });
  });

  describe('MuxVideoMedia (server)', () => {
    it('should import without crashing', async () => {
      const mod = await import('../mux/server');
      expect(mod.MuxVideoMedia).toBeDefined();
    });

    it('should construct without crashing', async () => {
      const { MuxVideoMedia } = await import('../mux/server');
      const media = new MuxVideoMedia();
      expect(media.engine).toBeNull();
    });
  });

  describe('MuxAudioMedia (server)', () => {
    it('should import without crashing', async () => {
      const mod = await import('../mux/server');
      expect(mod.MuxAudioMedia).toBeDefined();
    });

    it('should construct without crashing', async () => {
      const { MuxAudioMedia } = await import('../mux/server');
      const media = new MuxAudioMedia();
      expect(media.engine).toBeNull();
    });
  });

  describe('NativeHlsMedia (server)', () => {
    it('should import without crashing', async () => {
      const mod = await import('../native-hls/server');
      expect(mod.NativeHlsMedia).toBeDefined();
    });

    it('should construct without crashing', async () => {
      const { NativeHlsMedia } = await import('../native-hls/server');
      const media = new NativeHlsMedia();
      expect(media.engine).toBeNull();
      expect(media.src).toBe('');
    });
  });

  describe('SimpleHlsMedia (server)', () => {
    it('should import without crashing', async () => {
      const mod = await import('../simple-hls/server');
      expect(mod.SimpleHlsMedia).toBeDefined();
    });

    it('should construct without crashing', async () => {
      const { SimpleHlsMedia } = await import('../simple-hls/server');
      const media = new SimpleHlsMedia();
      expect(media.engine).toBeNull();
      expect(media.src).toBe('');
    });
  });

  describe('CustomMediaElement (server)', () => {
    it('should import without crashing', async () => {
      const mod = await import('../custom-media-element/server');
      expect(mod.CustomMediaElement).toBeDefined();
      expect(mod.VideoCSSVars).toBeDefined();
      expect(mod.AudioCSSVars).toBeDefined();
    });

    it('should return a class without crashing', async () => {
      const { CustomMediaElement } = await import('../custom-media-element/server');
      const TestElement = CustomMediaElement(
        'video',
        class extends EventTarget {
          target = null;
          attach() {}
          detach() {}
          destroy() {}
        } as any
      );
      expect(TestElement).toBeDefined();
      expect(TestElement.observedAttributes).toEqual([]);
    });
  });
});
