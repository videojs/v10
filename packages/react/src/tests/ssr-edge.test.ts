// @ts-nocheck — server dist has no type declarations
// @vitest-environment edge-runtime
import { describe, expect, it } from 'vitest';

describe('Edge SSR safety', () => {
  it('@videojs/react server media/hls-video', async () => {
    const mod = await import('../../../dist/server/media/hls-video/index.js');
    expect(mod).toBeDefined();
  });

  it('@videojs/react server media/dash-video', async () => {
    const mod = await import('../../../dist/server/media/dash-video/index.js');
    expect(mod).toBeDefined();
  });

  it('@videojs/react server media/mux-video', async () => {
    const mod = await import('../../../dist/server/media/mux-video/index.js');
    expect(mod).toBeDefined();
  });

  it('@videojs/react server media/mux-audio', async () => {
    const mod = await import('../../../dist/server/media/mux-audio/index.js');
    expect(mod).toBeDefined();
  });
});
