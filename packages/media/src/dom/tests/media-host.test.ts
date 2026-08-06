import { afterEach, describe, expect, it, vi } from 'vitest';
import { HTMLAudioElementHost } from '../audio-host';
import { addMediaComponent, type MediaComponent } from '../media-host';

afterEach(() => {
  document.body.innerHTML = '';
});

class MutedOverride implements MediaComponent {
  get targetOverride() {
    return { muted: true };
  }
}

class VolumeOverride implements MediaComponent {
  get targetOverride() {
    return { volume: 0.5 };
  }
}

class ContentDataOverride implements MediaComponent {
  get targetOverride() {
    return { contentData: { title: 'Component title' } };
  }
}

class AttachTracking implements MediaComponent {
  attach = vi.fn();
  detach = vi.fn();
  destroy = vi.fn();
}

class CastLikeOverride implements MediaComponent {
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

      addMediaComponent(host, new MutedOverride());

      expect(host.muted).toBe(true);
    });

    it('falls through to the target when the override lacks the property', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      audio.defaultMuted = true;
      host.attach(audio);

      addMediaComponent(host, new MutedOverride());

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

      addMediaComponent(host, new VolumeOverride());

      expect(host.volume).toBe(0.5);
      expect(host.muted).toBe(true);
    });

    it('falls back to the default when nothing is attached', () => {
      const host = new HTMLAudioElementHost();
      expect(host.paused).toBe(true);
      expect(host.muted).toBe(false);
      expect(host.contentData).toBeUndefined();
    });

    it('reads content data independently from the legacy title property', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      audio.title = 'Legacy title';
      host.attach(audio);

      expect(host.contentData).toBeUndefined();

      addMediaComponent(host, new ContentDataOverride());

      expect(host.contentData).toEqual({ title: 'Component title' });
      expect(host.title).toBe('Legacy title');
    });

    it('writes setter values to the override when it owns the property', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      audio.muted = false;
      host.attach(audio);

      const component = new CastLikeOverride();
      addMediaComponent(host, component);

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
      addMediaComponent(host, component);

      expect(component.attach).toHaveBeenCalledWith(audio);
    });

    it('does not attach an added component when no target is attached', () => {
      const host = new HTMLAudioElementHost();

      const component = new AttachTracking();
      addMediaComponent(host, component);

      expect(component.attach).not.toHaveBeenCalled();
    });

    it('detaches and unregisters components on destroy', () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      audio.muted = false;
      host.attach(audio);

      const component = new AttachTracking();
      addMediaComponent(host, component);
      addMediaComponent(host, new MutedOverride());

      host.destroy();

      expect(component.detach).toHaveBeenCalledTimes(1);

      // The unregistered override no longer participates in property resolution.
      host.attach(audio);
      expect(host.muted).toBe(false);
    });

    it('does not destroy components it does not own on destroy', () => {
      const host = new HTMLAudioElementHost();
      host.attach(document.createElement('audio'));

      const component = new AttachTracking();
      addMediaComponent(host, component);

      host.destroy();

      // `<mux-data>` / `MuxData` own their component and may outlive the host.
      expect(component.destroy).not.toHaveBeenCalled();
    });

    it('invokes the override method when it owns the property', async () => {
      const host = new HTMLAudioElementHost();
      const audio = document.createElement('audio');
      host.attach(audio);

      const component = new CastLikeOverride();
      addMediaComponent(host, component);

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

  it('forwards contentdatachange from the attached media target', () => {
    const host = new HTMLAudioElementHost();
    const audio = document.createElement('audio') as HTMLAudioElement & {
      contentData: Record<string, string | null>;
    };
    audio.contentData = { title: null };
    const listener = vi.fn();

    host.attach(audio);
    host.addEventListener('contentdatachange', listener);

    audio.contentData = { title: 'Media title' };
    audio.dispatchEvent(new Event('contentdatachange'));

    expect(listener).toHaveBeenCalledOnce();
    expect(host.contentData).toEqual({ title: 'Media title' });
  });
});
