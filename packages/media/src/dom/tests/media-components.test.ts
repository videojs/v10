import { afterEach, describe, expect, it } from 'vitest';
import { HTMLAudioElementHost } from '../audio-host';
import { getMediaProp } from '../utils';

afterEach(() => {
  document.body.innerHTML = '';
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
