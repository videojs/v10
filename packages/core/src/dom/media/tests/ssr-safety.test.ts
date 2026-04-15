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
});
