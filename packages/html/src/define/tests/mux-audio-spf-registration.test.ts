import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The SPF-backed Mux element claims `<mux-audio>`, the same tag as its
 * hls.js-backed counterpart, and steps aside only when that tag is already taken.
 *
 * The tag resolves at module evaluation, so each case stubs the registry and
 * re-imports rather than registering for real — a real registration can't be
 * undone between tests.
 */
function stubRegistry(taken: string[]) {
  const define = vi.fn();
  vi.stubGlobal('customElements', {
    get: (tag: string) => (taken.includes(tag) ? class {} : undefined),
    define,
  });
  return define;
}

describe('mux-audio/spf registration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('registers as mux-audio when the tag is free', async () => {
    const define = stubRegistry([]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { MuxAudioElement } = await import('../media/mux-audio/spf');

    expect(MuxAudioElement.tagName).toBe('mux-audio');
    expect(define).toHaveBeenCalledWith('mux-audio', MuxAudioElement);
    expect(warn).not.toHaveBeenCalled();
  });

  it('falls back to mux-spf-audio when the hls.js-backed element already claimed the tag', async () => {
    const define = stubRegistry(['mux-audio']);
    // Silence the fallback warning; the case below is what asserts on it.
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { MuxAudioElement } = await import('../media/mux-audio/spf');

    expect(MuxAudioElement.tagName).toBe('mux-spf-audio');
    expect(define).toHaveBeenCalledWith('mux-spf-audio', MuxAudioElement);
  });

  it('warns that two Mux engines are in one runtime when it falls back', async () => {
    stubRegistry(['mux-audio']);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await import('../media/mux-audio/spf');

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain('mux-spf-audio');
  });

  it('imports without customElements, for SSR', async () => {
    vi.stubGlobal('customElements', undefined);

    await expect(import('../media/mux-audio/spf')).resolves.toBeDefined();
  });
});
