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

class ConfigurableComponent implements Component {
  static readonly configKey = 'fake';
  value = 0;
  label = '';
  destroy() {}
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

  describe('play', () => {
    it('rejects when nothing is attached', async () => {
      const host = new HTMLAudioElementHost();

      await expect(host.play()).rejects.toBeInstanceOf(DOMException);
    });

    it('rejects when the target lacks a play implementation', async () => {
      const host = new HTMLAudioElementHost();
      host.attach({} as HTMLAudioElement);

      await expect(host.play()).rejects.toBeInstanceOf(DOMException);
    });
  });

  describe('component config binding', () => {
    it('exposes the component instance under its configKey', () => {
      const host = new HTMLAudioElementHost();
      const component = new ConfigurableComponent();
      addComponent(host, component);

      expect(host.config.fake).toBe(component);
    });

    it('reads live values from the component', () => {
      const host = new HTMLAudioElementHost();
      const component = new ConfigurableComponent();
      addComponent(host, component);

      component.value = 5;
      expect((host.config.fake as ConfigurableComponent).value).toBe(5);
    });

    it('assigns onto the component when the namespace is written', () => {
      const host = new HTMLAudioElementHost();
      const component = new ConfigurableComponent();
      addComponent(host, component);

      host.config.fake = { value: 7, label: 'hi' };

      expect(component.value).toBe(7);
      expect(component.label).toBe('hi');
    });

    it('routes component keys through the config setter', () => {
      const host = new HTMLAudioElementHost();
      const component = new ConfigurableComponent();
      addComponent(host, component);

      host.config = { fake: { value: 3 }, hlsJs: { debug: true } };

      expect(component.value).toBe(3);
      // Component instance is not stored as a plain object on the host.
      expect(host.config.fake).toBe(component);
      // Non-component keys are stored on the host bag.
      expect(host.config.hlsJs).toEqual({ debug: true });
    });

    it('reflects a component added after the first config access', () => {
      const host = new HTMLAudioElementHost();
      // Access config before the component exists to build the proxy.
      expect(host.config.fake).toBeUndefined();

      const component = new ConfigurableComponent();
      addComponent(host, component);

      expect(host.config.fake).toBe(component);
    });

    it('includes the configKey in has/ownKeys', () => {
      const host = new HTMLAudioElementHost();
      addComponent(host, new ConfigurableComponent());

      expect('fake' in host.config).toBe(true);
      expect(Object.keys(host.config)).toContain('fake');
    });

    it('merges host-level keys on assignment', () => {
      const host = new HTMLAudioElementHost();

      host.config = { a: 1 };
      host.config = { b: 2 };

      expect(host.config.a).toBe(1);
      expect(host.config.b).toBe(2);
    });

    it('removes the config binding when the component is removed', () => {
      const host = new HTMLAudioElementHost();
      const remove = addComponent(host, new ConfigurableComponent());

      remove();

      expect(host.config.fake).toBeUndefined();
      expect('fake' in host.config).toBe(false);
    });

    it('adopts config set before the component was registered', () => {
      const host = new HTMLAudioElementHost();
      host.config = { fake: { value: 4, label: 'early' } };

      const component = new ConfigurableComponent();
      addComponent(host, component);

      expect(component.value).toBe(4);
      expect(component.label).toBe('early');
      expect(host.config.fake).toBe(component);
    });
  });
});
