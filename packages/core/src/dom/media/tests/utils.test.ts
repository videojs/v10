import { afterEach, describe, expect, it } from 'vitest';
import { HTMLAudioElementHost } from '../audio-host';
import { addComponent, type Component } from '../media-host';
import { callProp, getProp } from '../utils';

afterEach(() => {
  document.body.innerHTML = '';
});

class PlayOverride implements Component {
  readonly api = {
    playCount: 0,
    play() {
      this.playCount++;
      return Promise.resolve();
    },
  };

  get targetOverride() {
    return this.api;
  }
}

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

describe('callProp', () => {
  it('invokes the method with its owner as `this`', async () => {
    const host = new HTMLAudioElementHost();
    host.attach(document.createElement('audio'));

    const component = new PlayOverride();
    addComponent(host, component);

    await callProp(host, 'play');

    expect(component.api.playCount).toBe(1);
  });

  it('returns the method result', () => {
    const host = new HTMLAudioElementHost();
    const audio = document.createElement('audio');
    host.attach(audio);

    expect(callProp(host, 'canPlayType', 'video/mp4')).toBe(audio.canPlayType('video/mp4'));
  });

  it('returns undefined when no owner exposes the method', () => {
    const host = new HTMLAudioElementHost();
    expect(callProp(host, 'play')).toBeUndefined();
  });
});
