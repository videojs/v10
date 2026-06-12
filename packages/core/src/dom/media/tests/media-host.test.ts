import { afterEach, describe, expect, it, vi } from 'vitest';
import { HTMLAudioElementHost } from '../audio-host';
import { addComponent, type Component } from '../media-host';

afterEach(() => {
  document.body.innerHTML = '';
});

class MutedOverride implements Component {
  get targetOverride() {
    return { muted: true };
  }
}

class VolumeOverride implements Component {
  get targetOverride() {
    return { volume: 0.5 };
  }
}

class AttachTracking implements Component {
  attach = vi.fn();
  destroy = vi.fn();
}

class CastLikeOverride implements Component {
  readonly api = {
    muted: false,
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

describe('HTMLMediaElementHost', () => {
  describe('component overrides', () => {
    it('returns the override value when a component exposes the property', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      audio.muted = false;
      host.attach(audio);

      addComponent(host, new MutedOverride());

      expect(host.muted).toBe(true);
    });

    it('falls through to the target when the override lacks the property', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      audio.defaultMuted = true;
      host.attach(audio);

      addComponent(host, new MutedOverride());

      // `defaultMuted` isn't overridden, so it reads from the target.
      expect(host.defaultMuted).toBe(true);
    });

    it('falls through to the target when no component overrides the property', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      audio.muted = true;
      host.attach(audio);

      expect(host.muted).toBe(true);
    });

    it('falls through to the target for properties the override does not own', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      audio.muted = true;
      host.attach(audio);

      addComponent(host, new VolumeOverride());

      expect(host.volume).toBe(0.5);
      expect(host.muted).toBe(true);
    });

    it('falls back to the default when nothing is attached', () => {
      const host = new HTMLAudioElementHost();
      expect(host.paused).toBe(true);
      expect(host.muted).toBe(false);
    });

    it('writes setter values to the override when it owns the property', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      audio.muted = false;
      host.attach(audio);

      const component = new CastLikeOverride();
      addComponent(host, component);

      host.muted = true;

      expect(component.api.muted).toBe(true);
      expect(audio.muted).toBe(false);
    });

    it('writes setter values to the target when no override owns the property', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      host.attach(audio);

      host.muted = true;

      expect(audio.muted).toBe(true);
    });

    it('attaches a late-added component to the current target', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      host.attach(audio);

      const component = new AttachTracking();
      addComponent(host, component);

      expect(component.attach).toHaveBeenCalledWith(audio);
    });

    it('does not attach an added component when no target is attached', () => {
      const host = new HTMLAudioElementHost();

      const component = new AttachTracking();
      addComponent(host, component);

      expect(component.attach).not.toHaveBeenCalled();
    });

    it('destroys and unregisters components on destroy', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      audio.muted = false;
      host.attach(audio);

      const component = new AttachTracking();
      addComponent(host, component);
      addComponent(host, new MutedOverride());

      host.destroy();

      expect(component.destroy).toHaveBeenCalledTimes(1);

      // The destroyed override no longer participates in property resolution.
      host.attach(audio);
      expect(host.muted).toBe(false);
    });

    it('invokes the override method when it owns the property', async () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      host.attach(audio);

      const component = new CastLikeOverride();
      addComponent(host, component);

      await host.play();

      expect(component.api.playCount).toBe(1);
    });
  });
});
