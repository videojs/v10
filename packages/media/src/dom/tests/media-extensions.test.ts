import { afterEach, describe, expect, it } from 'vite-plus/test';

import { HTMLAudioElementHost } from '../audio-host';
import type { MediaExtension } from '../media-host';
import { addMediaExtension, getMediaProp } from '../utils';

afterEach(() => {
  document.body.innerHTML = '';
});

class DetachableComponent implements MediaExtension {
  detachCount = 0;
  detach() {
    this.detachCount++;
  }
}

describe('addMediaExtension', () => {
  it('detaches the component when it is unregistered', () => {
    const host = new HTMLAudioElementHost();

    host.attach(document.createElement('audio'));
    const component = new DetachableComponent();

    const remove = addMediaExtension(host, component);

    remove();

    expect(component.detachCount).toBe(1);
  });

  it('detaches the previous component when another instance replaces it', () => {
    const host = new HTMLAudioElementHost();

    host.attach(document.createElement('audio'));
    const first = new DetachableComponent();
    const second = new DetachableComponent();

    const removeFirst = addMediaExtension(host, first);

    addMediaExtension(host, second);
    removeFirst();

    expect(first.detachCount).toBe(1);
    // The stale cleanup does not detach the replacement.
    expect(second.detachCount).toBe(0);
  });
});

describe('getMediaProp', () => {
  it('returns the owner value', () => {
    const host = new HTMLAudioElementHost();
    const audio = document.createElement('audio');

    audio.loop = true;
    host.attach(audio);

    expect(getMediaProp(host, 'loop')).toBe(true);
  });

  it('returns undefined when nothing is attached', () => {
    const host = new HTMLAudioElementHost();

    expect(getMediaProp(host, 'loop')).toBeUndefined();
  });
});
