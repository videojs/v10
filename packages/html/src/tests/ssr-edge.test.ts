// @ts-nocheck — server dist has no type declarations
// @vitest-environment edge-runtime
import { describe, expect, it } from 'vitest';

describe('Edge SSR safety', () => {
  it('@videojs/html server define/media/hls-video', async () => {
    const mod = await import('../../../dist/server/define/media/hls-video.js');
    expect(mod).toBeDefined();
  });

  it('@videojs/html server define/media/dash-video', async () => {
    const mod = await import('../../../dist/server/define/media/dash-video.js');
    expect(mod).toBeDefined();
  });

  it('@videojs/html server define/media/mux-video', async () => {
    const mod = await import('../../../dist/server/define/media/mux-video.js');
    expect(mod).toBeDefined();
  });

  it('@videojs/html server define/video/skin', async () => {
    const mod = await import('../../../dist/server/define/video/skin.js');
    expect(mod).toBeDefined();
  });
});
