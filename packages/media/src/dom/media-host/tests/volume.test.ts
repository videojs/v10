import type { Constructor } from '@videojs/utils/types';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { isMediaVolumeCapable } from '../../../core/predicate';
import { HTMLAudioElementHost } from '../../audio-host';
import { CustomMediaElement } from '../../custom-media-element';
import type { MediaHostBase } from '../base';
import { volumeCapability } from '../capabilities/volume';
import {
  createMediaHost,
  defineMediaCapability,
  getMediaCapabilityEvents,
  supportsMediaCapability,
} from '../capability';

const loopCapability = defineMediaCapability<{ loop: boolean }>()({
  name: 'loop',
  events: [],
  attributes: { loop: { type: Boolean } },
  props: { loop: { fallback: false } },
});

/** A host for media with no notion of loudness — an animated image, say. */
class GifMediaHost extends createMediaHost([loopCapability]) {}

class VolumeMediaHost extends createMediaHost([volumeCapability]) {}

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
  it('forwards a described capability to the attached target', () => {
    const host = new VolumeMediaHost();
    const audio = document.createElement('audio');

    host.attach(audio);
    host.volume = 0.5;
    host.muted = true;
    host.defaultMuted = true;

    expect(audio.volume).toBe(0.5);
    expect(audio.muted).toBe(true);
    expect(audio.defaultMuted).toBe(true);
    expect(host.volume).toBe(0.5);
  });

  it('reports the described fallbacks while nothing is attached', () => {
    const host = new VolumeMediaHost();

    expect(host.volume).toBe(1);
    expect(host.muted).toBe(false);
    expect(host.defaultMuted).toBe(false);
  });

  it('leaves a host that does not compose volume with no volume surface at all', () => {
    const host = new GifMediaHost();

    expect('volume' in host).toBe(false);
    expect('muted' in host).toBe(false);
    expect('defaultMuted' in host).toBe(false);
    expect('loop' in host).toBe(true);
  });

  it('lets capability detection tell the two hosts apart', () => {
    // The full host still reports as capable, so nothing downstream changes.
    expect(isMediaVolumeCapable(new HTMLAudioElementHost())).toBe(true);
    expect(isMediaVolumeCapable(new VolumeMediaHost())).toBe(true);
    // Before the split every host inherited `volume`/`muted` and this was `true`,
    // so the player's volume feature attached to media that cannot use it.
    expect(isMediaVolumeCapable(new GifMediaHost())).toBe(false);
  });

  it('answers capability questions from the manifest rather than by duck typing', () => {
    expect(supportsMediaCapability(new VolumeMediaHost(), 'volume')).toBe(true);
    expect(supportsMediaCapability(new GifMediaHost(), 'volume')).toBe(false);
    // Inherited by hosts composed on top of a described one.
    expect(supportsMediaCapability(new HTMLAudioElementHost(), 'volume')).toBe(true);
  });

  it('knows which events its capabilities emit', () => {
    expect(getMediaCapabilityEvents(VolumeMediaHost)).toEqual(['volumechange']);
    expect(getMediaCapabilityEvents(GifMediaHost)).toEqual([]);
  });
});

describe('CustomMediaElement', () => {
  it('mirrors volume onto the element only when the host composes it', () => {
    const { element: withVolume } = defineElement(VolumeMediaHost);
    const { element: withoutVolume } = defineElement(GifMediaHost);

    expect('volume' in withVolume).toBe(true);
    expect('muted' in withVolume).toBe(true);

    expect('volume' in withoutVolume).toBe(false);
    expect('muted' in withoutVolume).toBe(false);
  });

  it('reflects a capability-declared attribute only when the host composes it', () => {
    const { Ctor: WithVolume, element: withVolume } = defineElement(VolumeMediaHost);
    const { Ctor: WithoutVolume, element: withoutVolume } = defineElement(GifMediaHost);

    expect(WithVolume.observedAttributes).toContain('muted');
    expect('defaultMuted' in withVolume).toBe(true);

    // The `muted` attribute now comes from the volume capability rather than a
    // hardcoded bag, so a host without volume never observes or reflects it.
    expect(WithoutVolume.observedAttributes).not.toContain('muted');
    expect(WithoutVolume.observedAttributes).toContain('loop');
    expect('defaultMuted' in withoutVolume).toBe(false);
  });
});
