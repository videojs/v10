import { describe, expect, it, vi } from 'vitest';
import { MuxData } from '..';
import type { MuxDataSdk } from '../types';

function createSdk() {
  const monitor = vi.fn();
  const sdk = {
    monitor,
    utils: { now: () => 0, generateUUID: () => 'uuid' },
  } as unknown as MuxDataSdk;
  return { sdk, monitor };
}

describe('MuxData', () => {
  it('accepts a player software name', () => {
    expect(new MuxData({ playerSoftwareName: 'mux-video' }).playerSoftwareName).toBe('mux-video');
  });

  it('monitors the attached target with the configured data', async () => {
    const { sdk, monitor } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key', playerSoftwareName: 'mux-video' });
    const video = document.createElement('video');

    data.setMedia({ engine: null, src: 'https://stream.mux.com/abc123.m3u8' });
    data.attach(video);

    // Initialization is deferred by a microtask so all props settle first.
    await Promise.resolve();
    await Promise.resolve();

    expect(monitor).toHaveBeenCalledWith(
      video,
      expect.objectContaining({
        data: expect.objectContaining({ env_key: 'key', player_software_name: 'mux-video' }),
      })
    );
  });

  it('does not monitor before a target is attached', async () => {
    const { sdk, monitor } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk });

    data.setMedia({ engine: null, src: 'https://stream.mux.com/abc123.m3u8' });

    await Promise.resolve();
    await Promise.resolve();

    expect(monitor).not.toHaveBeenCalled();
  });
});
