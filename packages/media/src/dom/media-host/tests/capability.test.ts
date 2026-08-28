import type { Constructor } from '@videojs/utils/types';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { isMediaVolumeCapable } from '../../../core/predicate';
import { HTMLAudioElementHost } from '../../audio-host';
import { CustomMediaElement } from '../../custom-media-element';
import { HTMLVideoElementHost } from '../../video-host';
import type { MediaHostBase } from '../base';
import { pauseCapability, playbackCapability, posterCapability, sourceCapability } from '../capabilities';
import { createMediaHost, getMediaCapabilityEvents, supportsMediaCapability } from '../capability';
import { HTMLMediaElementHost } from '../media-host';

/**
 * A host for media with no notion of loudness, rate, or a timeline — an animated image, say. It plays, it stops, it has
 * a source and a still to show first, and nothing else.
 */
class GifMediaHost extends createMediaHost([playbackCapability, pauseCapability, sourceCapability, posterCapability]) {}

let tagCounter = 0;

function defineElement(Host: Constructor<MediaHostBase>) {
  const tag = `capability-video-${++tagCounter}`;
  const Ctor = CustomMediaElement('video', Host);

  customElements.define(tag, Ctor);

  return { Ctor, element: document.createElement(tag) };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createMediaHost', () => {
  it('forwards described properties to the attached target', () => {
    const host = new HTMLAudioElementHost();
    const audio = document.createElement('audio');

    host.attach(audio);
    host.volume = 0.5;
    host.muted = true;
    host.currentTime = 12;

    expect(audio.volume).toBe(0.5);
    expect(audio.muted).toBe(true);
    expect(audio.currentTime).toBe(12);
    expect(host.volume).toBe(0.5);
  });

  it('reports the described fallbacks while nothing is attached', () => {
    const host = new HTMLAudioElementHost();

    expect(host.volume).toBe(1);
    expect(host.muted).toBe(false);
    expect(host.paused).toBe(true);
    expect(host.duration).toBeNaN();
    expect(host.preload).toBe('metadata');
    expect(host.crossOrigin).toBeNull();
    expect(host.contentData).toBeUndefined();
  });

  it('gives a readonly property no setter', () => {
    const proto = Object.getPrototypeOf(new HTMLAudioElementHost());

    expect(findDescriptor(proto, 'paused')?.set).toBeUndefined();
    expect(findDescriptor(proto, 'currentTime')?.set).toBeDefined();
  });

  it('forwards described methods to the owner', () => {
    const host = new HTMLAudioElementHost();
    const audio = document.createElement('audio');
    const pause = vi.spyOn(audio, 'pause').mockImplementation(() => {});

    host.attach(audio);
    host.pause();

    expect(pause).toHaveBeenCalled();
  });

  it('answers with the method fallback when no media is attached', async () => {
    const host = new HTMLAudioElementHost();

    await expect(host.play()).rejects.toThrow('No media is attached.');
    expect(host.canPlayType('video/mp4')).toBe('');
  });

  it('lets a capability own its state and announce its own event', () => {
    const host = new HTMLAudioElementHost();
    const onChange = vi.fn();

    host.addEventListener('streamtypechange', onChange);
    host.streamType = 'live';

    expect(host.streamType).toBe('live');
    expect(onChange).toHaveBeenCalledTimes(1);

    // Setting the same value again is not a change.
    host.streamType = 'live';
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('carries a base host capabilities down to the hosts composed on it', () => {
    const host = new HTMLVideoElementHost();

    expect(supportsMediaCapability(host, 'volume')).toBe(true);
    expect(supportsMediaCapability(host, 'poster')).toBe(true);
    // Composition runs through the class chain, so `instanceof` still holds for
    // the consumers that narrow on it.
    expect(host).toBeInstanceOf(HTMLMediaElementHost);
  });
});

describe('createMediaHost with a narrower manifest', () => {
  it('leaves out every member of a capability it does not compose', () => {
    const host = new GifMediaHost();

    expect('volume' in host).toBe(false);
    expect('muted' in host).toBe(false);
    expect('playbackRate' in host).toBe(false);
    expect('currentTime' in host).toBe(false);
    expect('addTextTrack' in host).toBe(false);
    expect('remote' in host).toBe(false);

    expect('play' in host).toBe(true);
    expect('paused' in host).toBe(true);
    expect('src' in host).toBe(true);
    expect('poster' in host).toBe(true);
  });

  it('lets capability detection tell the hosts apart', () => {
    // The full host still reports as capable, so nothing downstream changes.
    expect(isMediaVolumeCapable(new HTMLAudioElementHost())).toBe(true);
    // Before the split every host inherited `volume`/`muted` and this was `true`,
    // so the player's volume feature attached to media that cannot use it.
    expect(isMediaVolumeCapable(new GifMediaHost())).toBe(false);
  });

  it('answers capability questions from the manifest rather than by duck typing', () => {
    expect(supportsMediaCapability(new GifMediaHost(), 'playback')).toBe(true);
    expect(supportsMediaCapability(new GifMediaHost(), 'volume')).toBe(false);
    expect(supportsMediaCapability(new HTMLAudioElementHost(), 'volume')).toBe(true);
  });

  it('knows which events its capabilities emit', () => {
    expect(getMediaCapabilityEvents(GifMediaHost)).toEqual([
      'play',
      'playing',
      'waiting',
      'pause',
      'ended',
      'loadstart',
      'emptied',
      'canplay',
      'canplaythrough',
      'loadeddata',
      'abort',
      'stalled',
      'suspend',
    ]);
    expect(getMediaCapabilityEvents(HTMLAudioElementHost)).toContain('volumechange');
  });
});

describe('CustomMediaElement', () => {
  it('mirrors a property onto the element only when the host composes its capability', () => {
    const { element: full } = defineElement(HTMLVideoElementHost);
    const { element: gif } = defineElement(GifMediaHost);

    expect('volume' in full).toBe(true);
    expect('playbackRate' in full).toBe(true);

    expect('volume' in gif).toBe(false);
    expect('playbackRate' in gif).toBe(false);
    expect('poster' in gif).toBe(true);
  });

  it('reflects a capability-declared attribute only when the host composes its capability', () => {
    const { Ctor: Full } = defineElement(HTMLVideoElementHost);
    const { Ctor: Gif, element: gif } = defineElement(GifMediaHost);

    expect(Full.observedAttributes).toContain('muted');
    expect(Full.observedAttributes).toContain('loop');
    expect(Full.observedAttributes).toContain('stream-type');

    // The attribute surface comes from the host's manifest rather than a
    // hardcoded bag, so a host without volume never observes `muted`.
    expect(Gif.observedAttributes).not.toContain('muted');
    expect(Gif.observedAttributes).not.toContain('loop');
    expect(Gif.observedAttributes).toContain('src');
    expect(Gif.observedAttributes).toContain('poster');
    expect('defaultMuted' in gif).toBe(false);
  });
});

function findDescriptor(start: object, prop: string): PropertyDescriptor | undefined {
  for (let proto = start; proto; proto = Object.getPrototypeOf(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    if (descriptor) return descriptor;
  }

  return undefined;
}
