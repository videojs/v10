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
    it('applies a component namespace onto the component when config is set', () => {
      const host = new HTMLAudioElementHost();
      const component = new ConfigurableComponent();
      addComponent(host, component);

      host.config = { fake: { value: 3, label: 'a' } };

      expect(component.value).toBe(3);
      expect(component.label).toBe('a');
    });

    it('stores config as plain values, never component instances', () => {
      const host = new HTMLAudioElementHost();
      addComponent(host, new ConfigurableComponent());

      host.config = { fake: { value: 3 }, hlsJs: { debug: true } };

      // `config` is a plain bag of what was set — reading it back yields the
      // assigned POJO, never the component instance.
      expect(host.config.fake).toEqual({ value: 3 });
      expect(host.config.fake).not.toBeInstanceOf(ConfigurableComponent);
      expect(host.config.hlsJs).toEqual({ debug: true });
    });

    it('returns the same object that was assigned', () => {
      const host = new HTMLAudioElementHost();
      const value = { fake: { value: 1 }, a: 2 };

      host.config = value;

      expect(host.config).toBe(value);
    });

    it('round-trips through JSON without leaking component instances', () => {
      const host = new HTMLAudioElementHost();
      addComponent(host, new ConfigurableComponent());

      host.config = { fake: { value: 5, label: 'a' }, a: 1 };

      // The stringified getter is valid input to the setter — plain values only.
      const serialized = JSON.parse(JSON.stringify(host.config));
      expect(serialized).toEqual({ fake: { value: 5, label: 'a' }, a: 1 });
    });

    it('does not apply config when the returned object is mutated directly', () => {
      const host = new HTMLAudioElementHost();
      const component = new ConfigurableComponent();
      addComponent(host, component);

      // Only the setter applies namespaces to components; mutating the bag in
      // place bypasses it.
      host.config.fake = { value: 7, label: 'hi' };

      expect(component.value).toBe(0);
      expect(component.label).toBe('');
    });

    it('replaces the entire config object on set', () => {
      const host = new HTMLAudioElementHost();

      host.config = { a: 1 };
      host.config = { b: 2 };

      // A new object replaces the old one wholesale; prior keys are dropped.
      expect(host.config.a).toBeUndefined();
      expect(host.config.b).toBe(2);
    });

    it('keeps component state when a later config omits its namespace', () => {
      const host = new HTMLAudioElementHost();
      const component = new ConfigurableComponent();
      addComponent(host, component);

      host.config = { fake: { value: 5 }, a: 1 };
      host.config = { b: 2 };

      // The component retains its applied state even though the new config
      // object no longer lists its namespace.
      expect(component.value).toBe(5);
      expect(host.config.fake).toBeUndefined();
      expect(host.config.a).toBeUndefined();
      expect(host.config.b).toBe(2);
    });

    it('overwrites component state only for keys present in the new config', () => {
      const host = new HTMLAudioElementHost();
      const component = new ConfigurableComponent();
      addComponent(host, component);

      host.config = { fake: { value: 5, label: 'a' } };
      host.config = { fake: { value: 9 } };

      expect(component.value).toBe(9);
      expect(component.label).toBe('a');
    });

    it('stops applying config to a removed component', () => {
      const host = new HTMLAudioElementHost();
      const component = new ConfigurableComponent();
      const remove = addComponent(host, component);

      remove();
      host.config = { fake: { value: 7 } };

      expect(component.value).toBe(0);
    });

    it('adopts config set before the component was registered', () => {
      const host = new HTMLAudioElementHost();
      host.config = { fake: { value: 4, label: 'early' } };

      const component = new ConfigurableComponent();
      addComponent(host, component);

      expect(component.value).toBe(4);
      expect(component.label).toBe('early');
      // The plain value stays in the bag; it was never replaced.
      expect(host.config.fake).toEqual({ value: 4, label: 'early' });
    });

    it('drops pre-registration component config after an intervening config reset', () => {
      const host = new HTMLAudioElementHost();
      host.config = { fake: { value: 4, label: 'early' } };
      // A later config object replaces the bag wholesale, so the staged value is
      // gone before the component registers.
      host.config = { a: 1 };

      const component = new ConfigurableComponent();
      addComponent(host, component);

      expect(component.value).toBe(0);
      expect(component.label).toBe('');
      expect(host.config.fake).toBeUndefined();
    });
  });
});
