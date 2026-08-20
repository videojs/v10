/**
 * The host-bound Media, covering what binding to a host is what makes true: the
 * fixed behavior is readable back off the Media because the host forwards to the
 * element, not because the adapter keeps a parallel copy of it.
 */
import { describe, expect, it } from 'vitest';
import { HlsBackgroundVideoMedia } from '../media';

describe('HlsBackgroundVideoMedia', () => {
  it('reports the fixed behavior from the attached element', () => {
    const media = new HlsBackgroundVideoMedia();
    const el = document.createElement('video');

    media.attach(el);

    expect(media.loop).toBe(true);
    expect(media.muted).toBe(true);
    expect(media.autoplay).toBe(true);
    expect(media.preload).toBe('auto');
  });

  it('follows the element when it is changed underneath', () => {
    const media = new HlsBackgroundVideoMedia();
    const el = document.createElement('video');
    media.attach(el);

    el.loop = false;

    // The reason for not shadowing these: a stored value would still claim true.
    expect(media.loop).toBe(false);
  });
});
