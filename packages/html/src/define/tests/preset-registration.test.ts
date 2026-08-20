import { afterAll, beforeAll, describe, expect, it, type MockInstance, vi } from 'vitest';

describe('preset registration boundaries', () => {
  let define: MockInstance;

  function registeredSince(offset: number): string[] {
    return define.mock.calls.slice(offset).map((call) => call[0] as string);
  }

  beforeAll(() => {
    define = vi.spyOn(customElements, 'define');
  });

  afterAll(() => {
    define.mockRestore();
  });

  it('video/ui registers the container and UI without the player or skin', async () => {
    const before = define.mock.calls.length;
    await import('../video/ui');
    const registered = registeredSince(before);

    expect(registered).toContain('media-container');
    expect(registered).toContain('media-play-button');
    expect(registered).not.toContain('video-player');
    expect(registered).not.toContain('video-skin');
  });

  it('video/skin adds the skin without the player', async () => {
    const before = define.mock.calls.length;
    await import('../video/skin');

    expect(registeredSince(before)).toEqual(['video-skin']);
  });

  it('video/player registers only the player', async () => {
    const before = define.mock.calls.length;
    await import('../video/player');

    expect(registeredSince(before)).toEqual(['video-player']);
  });
});
