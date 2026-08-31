/**
 * The host-bound Media, covering what binding to a host is what makes true: the fixed behavior is readable back off the
 * Media because the host forwards to the element, not because the adapter keeps a parallel copy of it.
 */
import { describe, expect, it } from 'vite-plus/test';

import { HlsBackgroundVideoMedia } from '../media';

describe('HlsBackgroundVideoMedia', () => {
  it('reports the fixed behavior from the attached element', () => {
    const media = new HlsBackgroundVideoMedia();
    const el = document.createElement('video');

    media.attach(el);

    expect(media.loop).toBe(true);
    expect(media.autoplay).toBe(true);
    expect(media.preload).toBe('auto');
  });

  it('exposes no muted or volume: audio is subtracted by design, and element muting is the adapter workaround', () => {
    const media = new HlsBackgroundVideoMedia();
    const el = document.createElement('video');

    media.attach(el);

    // The adapter still fixes muted on the element for autoplay policy…
    expect(el.muted).toBe(true);

    // …but the media API carries no volume capability at all.
    expect('muted' in media).toBe(false);
    expect('volume' in media).toBe(false);
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
