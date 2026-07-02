import { afterEach, describe, expect, it } from 'vitest';
import { HTMLAudioElementHost } from '../audio-host';
import { getProp } from '../utils';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('getProp', () => {
  it('returns the owner value', () => {
    const host = new HTMLAudioElementHost();
    const audio = document.createElement('audio');
    audio.loop = true;
    host.attach(audio);

    expect(getProp(host, 'loop')).toBe(true);
  });

  it('returns undefined when nothing is attached', () => {
    const host = new HTMLAudioElementHost();
    expect(getProp(host, 'loop')).toBeUndefined();
  });
});
