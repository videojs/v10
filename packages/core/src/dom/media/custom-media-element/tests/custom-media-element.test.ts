import { afterEach, describe, expect, it, vi } from 'vitest';
import { HTMLAudioElementHost } from '../../audio-host';
import { HTMLVideoElementHost } from '../../video-host';
import { AudioAttributes, CustomMediaElement, VideoAttributes } from '../index';

afterEach(() => {
  document.body.innerHTML = '';
});

class TestVideoHost extends HTMLVideoElementHost {
  #src = '';
  #destroyed = false;

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }

  get destroyed() {
    return this.#destroyed;
  }

  destroy() {
    this.#destroyed = true;
  }
}

class TestAudioHost extends HTMLAudioElementHost {
  destroy() {}
}

let tagCounter = 0;

function defineVideoElement() {
  const tag = `test-video-${++tagCounter}`;
  const Ctor = CustomMediaElement('video', TestVideoHost);
  customElements.define(tag, Ctor);
  return { Ctor, tag };
}

function defineAudioElement() {
  const tag = `test-audio-${++tagCounter}`;
  const Ctor = CustomMediaElement('audio', TestAudioHost);
  customElements.define(tag, Ctor);
  return { Ctor, tag };
}

function create(def: { Ctor: new () => any; tag: string }) {
  const el = new def.Ctor();
  document.body.appendChild(el);
  return el;
}

describe('CustomMediaElement', () => {
  describe('shadow DOM setup', () => {
    it('creates a shadow root with a video element for video tag', () => {
      const el = create(defineVideoElement());
      expect(el.shadowRoot).toBeTruthy();
      expect(el.shadowRoot!.querySelector('video')).toBeTruthy();
    });

    it('creates a shadow root with an audio element for audio tag', () => {
      const el = create(defineAudioElement());
      expect(el.shadowRoot).toBeTruthy();
      expect(el.shadowRoot!.querySelector('audio')).toBeTruthy();
    });

    it('sets part attribute on the inner element', () => {
      const el = create(defineVideoElement());
      const video = el.shadowRoot!.querySelector('video')!;
      expect(video.getAttribute('part')).toBe('video');
    });
  });

  describe('target', () => {
    it('returns the shadow DOM media element by default', () => {
      const el = create(defineVideoElement());
      const video = el.shadowRoot!.querySelector('video');
      expect(el.target).toBe(video);
    });

    it('prefers a slotted element with slot=media', () => {
      const el = create(defineVideoElement());
      const slotted = document.createElement('video');
      slotted.slot = 'media';
      el.appendChild(slotted);
      expect(el.target).toBe(slotted);
    });
  });

  describe('static Attributes', () => {
    it('uses VideoAttributes for video tag', () => {
      expect(defineVideoElement().Ctor.Attributes).toEqual(VideoAttributes);
    });

    it('uses AudioAttributes for audio tag', () => {
      expect(defineAudioElement().Ctor.Attributes).toEqual(AudioAttributes);
    });

    it('VideoAttributes includes all AudioAttributes plus video-specific ones', () => {
      for (const attr of AudioAttributes) {
        expect(VideoAttributes).toContain(attr);
      }
      expect(VideoAttributes).toContain('poster');
      expect(VideoAttributes).toContain('disablepictureinpicture');
      expect(VideoAttributes).toContain('autopictureinpicture');
    });
  });

  describe('observedAttributes', () => {
    it('includes all standard video attributes', () => {
      const { Ctor } = defineVideoElement();
      for (const attr of VideoAttributes) {
        expect(Ctor.observedAttributes).toContain(attr);
      }
    });

    it('includes kebab-cased MediaHost properties with setters', () => {
      const { Ctor } = defineVideoElement();
      const observed = Ctor.observedAttributes;
      expect(observed).toContain('src');
      expect(observed).toContain('current-time');
      expect(observed).toContain('volume');
      expect(observed).toContain('muted');
      expect(observed).toContain('playback-rate');
    });
  });

  describe('video attribute forwarding', () => {
    it('forwards autoplay to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('autoplay', '');
      expect(el.target!.hasAttribute('autoplay')).toBe(true);
    });

    it('forwards controls to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('controls', '');
      expect(el.target!.hasAttribute('controls')).toBe(true);
    });

    it('forwards crossorigin to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('crossorigin', 'anonymous');
      expect(el.target!.getAttribute('crossorigin')).toBe('anonymous');
    });

    it('forwards loop to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('loop', '');
      expect(el.target!.hasAttribute('loop')).toBe(true);
    });

    it('forwards playsinline to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('playsinline', '');
      expect(el.target!.hasAttribute('playsinline')).toBe(true);
    });

    it('forwards preload to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('preload', 'none');
      expect(el.target!.getAttribute('preload')).toBe('none');
    });

    it('forwards poster to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('poster', 'https://example.com/poster.jpg');
      expect(el.target!.getAttribute('poster')).toBe('https://example.com/poster.jpg');
    });

    it('forwards controlslist to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('controlslist', 'nodownload');
      expect(el.target!.getAttribute('controlslist')).toBe('nodownload');
    });

    it('forwards disableremoteplayback to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('disableremoteplayback', '');
      expect(el.target!.hasAttribute('disableremoteplayback')).toBe(true);
    });

    it('forwards disablepictureinpicture to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('disablepictureinpicture', '');
      expect(el.target!.hasAttribute('disablepictureinpicture')).toBe(true);
    });

    it('forwards autopictureinpicture to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('autopictureinpicture', '');
      expect(el.target!.hasAttribute('autopictureinpicture')).toBe(true);
    });

    it('forwards loading to the target video element', () => {
      const el = create(defineVideoElement());
      el.setAttribute('loading', 'lazy');
      expect(el.target!.getAttribute('loading')).toBe('lazy');
    });

    it('forwards all non-setter VideoAttributes to the target', () => {
      const el = create(defineVideoElement());
      const target = el.target!;

      const booleanAttrs = [
        'autoplay',
        'controls',
        'disableremoteplayback',
        'loop',
        'playsinline',
        'autopictureinpicture',
        'disablepictureinpicture',
      ] as const;

      const valueAttrs = {
        controlslist: 'nodownload',
        crossorigin: 'anonymous',
        loading: 'lazy',
        preload: 'auto',
        poster: 'https://example.com/poster.jpg',
      } as const;

      for (const attr of booleanAttrs) {
        el.setAttribute(attr, '');
      }
      for (const [attr, value] of Object.entries(valueAttrs)) {
        el.setAttribute(attr, value);
      }

      for (const attr of booleanAttrs) {
        expect(target.hasAttribute(attr), `expected ${attr} to be present on target`).toBe(true);
      }
      for (const [attr, value] of Object.entries(valueAttrs)) {
        expect(target.getAttribute(attr), `expected ${attr}="${value}" on target`).toBe(value);
      }
    });

    it('removes forwarded attributes when removed from host', () => {
      const el = create(defineVideoElement());
      const target = el.target!;

      el.setAttribute('poster', 'https://example.com/poster.jpg');
      expect(target.getAttribute('poster')).toBe('https://example.com/poster.jpg');

      el.removeAttribute('poster');
      expect(target.hasAttribute('poster')).toBe(false);
    });

    it('updates forwarded attribute value when changed', () => {
      const el = create(defineVideoElement());
      const target = el.target!;

      el.setAttribute('preload', 'metadata');
      expect(target.getAttribute('preload')).toBe('metadata');

      el.setAttribute('preload', 'auto');
      expect(target.getAttribute('preload')).toBe('auto');
    });
  });

  describe('setter attributes route through MediaHost property', () => {
    it('sets muted property via attribute', () => {
      const el = create(defineVideoElement());
      el.setAttribute('muted', '');
      expect(el.muted).toBe(true);
    });

    it('unsets muted property when attribute removed', () => {
      const el = create(defineVideoElement());
      el.setAttribute('muted', '');
      expect(el.muted).toBe(true);

      el.removeAttribute('muted');
      expect(el.muted).toBe(false);
    });

    it('sets src property via attribute', () => {
      const el = create(defineVideoElement());
      el.setAttribute('src', 'https://example.com/video.mp4');
      expect(el.src).toBe('https://example.com/video.mp4');
    });

    it('sets volume via attribute', () => {
      const el = create(defineVideoElement());
      el.setAttribute('volume', '0.5');
      expect(el.volume).toBe(0.5);
    });
  });

  describe('MediaHost property delegation', () => {
    it('delegates getter properties to the MediaHost', () => {
      const el = create(defineVideoElement());
      expect(el.paused).toBe(true);
      expect(el.duration).toBeNaN();
      expect(el.currentTime).toBe(0);
    });

    it('delegates setter properties to the MediaHost', () => {
      const el = create(defineVideoElement());
      el.volume = 0.5;
      expect(el.target!.volume).toBe(0.5);
    });

    it('delegates methods to the MediaHost', () => {
      const el = create(defineVideoElement());
      expect(typeof el.play).toBe('function');
      expect(typeof el.pause).toBe('function');
      expect(typeof el.load).toBe('function');
    });

    it('excludes attach, detach, and destroy from delegation', () => {
      const { Ctor } = defineVideoElement();
      expect(Object.getOwnPropertyDescriptor(Ctor.prototype, 'attach')).toBeUndefined();
      expect(Object.getOwnPropertyDescriptor(Ctor.prototype, 'detach')).toBeUndefined();
      expect(Object.getOwnPropertyDescriptor(Ctor.prototype, 'destroy')).toBeUndefined();
    });
  });

  describe('event delegation', () => {
    it('forwards addEventListener to the MediaHost', () => {
      const el = create(defineVideoElement());
      const handler = vi.fn();

      el.addEventListener('play', handler);
      el.target!.dispatchEvent(new Event('play'));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('forwards removeEventListener to the MediaHost', () => {
      const el = create(defineVideoElement());
      const handler = vi.fn();

      el.addEventListener('play', handler);
      el.removeEventListener('play', handler);
      el.target!.dispatchEvent(new Event('play'));

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('disconnectedCallback', () => {
    it('calls destroy on the MediaHost when disconnected', () => {
      const el = create(defineVideoElement());
      expect(el.destroyed).toBe(false);

      el.remove();
      expect(el.destroyed).toBe(true);
    });

    it('does not destroy when keep-alive attribute is set', () => {
      const el = create(defineVideoElement());
      el.setAttribute('keep-alive', '');

      el.remove();
      expect(el.destroyed).toBe(false);
    });
  });

  describe('initial attribute forwarding', () => {
    it('applies attributes present at construction time to the template', () => {
      const { tag } = defineVideoElement();

      const container = document.createElement('div');
      document.body.appendChild(container);
      container.innerHTML = `<${tag} poster="https://example.com/poster.jpg" crossorigin="anonymous"></${tag}>`;

      const el = container.querySelector(tag)!;
      const video = el.shadowRoot!.querySelector('video')!;

      expect(video.getAttribute('poster')).toBe('https://example.com/poster.jpg');
      expect(video.getAttribute('crossorigin')).toBe('anonymous');
    });

    it('excludes MediaHost setter props from the inner element template', () => {
      const { tag } = defineVideoElement();

      const container = document.createElement('div');
      document.body.appendChild(container);
      container.innerHTML = `<${tag} src="video.mp4" volume="0.5" current-time="10" playback-rate="2" muted poster="poster.jpg"></${tag}>`;

      const el = container.querySelector(tag)!;
      const video = el.shadowRoot!.querySelector('video')!;

      expect(video.hasAttribute('src')).toBe(false);
      expect(video.hasAttribute('volume')).toBe(false);
      expect(video.hasAttribute('current-time')).toBe(false);
      expect(video.hasAttribute('playback-rate')).toBe(false);
      expect(video.hasAttribute('muted')).toBe(false);

      expect(video.getAttribute('poster')).toBe('poster.jpg');
    });

    it('excludes non-allowed attributes from the inner element template', () => {
      const { tag } = defineVideoElement();

      const container = document.createElement('div');
      document.body.appendChild(container);
      container.innerHTML = `<${tag} class="player" data-id="123" poster="poster.jpg" autoplay></${tag}>`;

      const el = container.querySelector(tag)!;
      const video = el.shadowRoot!.querySelector('video')!;

      expect(video.hasAttribute('class')).toBe(false);
      expect(video.hasAttribute('data-id')).toBe(false);

      expect(video.getAttribute('poster')).toBe('poster.jpg');
      expect(video.hasAttribute('autoplay')).toBe(true);
    });
  });
});
