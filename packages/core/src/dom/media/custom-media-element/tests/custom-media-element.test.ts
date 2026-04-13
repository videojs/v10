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

class TestVideoHostWithObjects extends HTMLVideoElementHost {
  #src = '';
  #config: Record<string, any> = {};
  #metadata: Record<string, any> | undefined;
  #debug = false;

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }

  get config() {
    return this.#config;
  }

  set config(value: Record<string, any>) {
    this.#config = value;
  }

  get metadata() {
    return this.#metadata;
  }

  set metadata(value: Record<string, any> | undefined) {
    this.#metadata = value;
  }

  get debug() {
    return this.#debug;
  }

  set debug(value: boolean) {
    this.#debug = value;
  }

  destroy() {}
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

function defineVideoElementWithObjects() {
  const tag = `test-video-${++tagCounter}`;
  const Ctor = CustomMediaElement('video', TestVideoHostWithObjects);
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

class TrackingVideoHost extends HTMLVideoElementHost {
  calls: string[] = [];
  #src = '';
  #volume = 1;
  #muted = false;
  #currentTime = 0;
  #playbackRate = 1;

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.calls.push(`set:src:${value}`);
    this.#src = value;
  }

  override get volume() {
    return this.#volume;
  }

  override set volume(value: number) {
    this.calls.push(`set:volume:${value}`);
    this.#volume = value;
  }

  override get muted() {
    return this.#muted;
  }

  override set muted(value: boolean) {
    this.calls.push(`set:muted:${value}`);
    this.#muted = value;
  }

  override get currentTime() {
    return this.#currentTime;
  }

  override set currentTime(value: number) {
    this.calls.push(`set:currentTime:${value}`);
    this.#currentTime = value;
  }

  override get playbackRate() {
    return this.#playbackRate;
  }

  override set playbackRate(value: number) {
    this.calls.push(`set:playbackRate:${value}`);
    this.#playbackRate = value;
  }

  destroy() {}
}

function defineTrackingVideoElement() {
  const tag = `test-video-${++tagCounter}`;
  const Ctor = CustomMediaElement('video', TrackingVideoHost);
  customElements.define(tag, Ctor);
  return { Ctor, tag };
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
      expect(VideoAttributes).toContain('disablePictureInPicture');
      expect(VideoAttributes).toContain('autoPictureInPicture');
    });
  });

  describe('observedAttributes', () => {
    it('includes all standard video attributes (lowercased)', () => {
      const { Ctor } = defineVideoElement();
      for (const attr of VideoAttributes) {
        expect(Ctor.observedAttributes).toContain(attr.toLowerCase());
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

  describe('non-MediaHost attribute property accessors', () => {
    it('boolean property getter returns false when attribute is absent', () => {
      const el = create(defineVideoElement());
      expect(el.autoplay).toBe(false);
      expect(el.controls).toBe(false);
      expect(el.loop).toBe(false);
    });

    it('boolean property getter returns true when attribute is present', () => {
      const el = create(defineVideoElement());
      el.setAttribute('autoplay', '');
      el.setAttribute('controls', '');
      el.setAttribute('loop', '');

      expect(el.autoplay).toBe(true);
      expect(el.controls).toBe(true);
      expect(el.loop).toBe(true);
    });

    it('boolean property setter adds the attribute', () => {
      const el = create(defineVideoElement());
      el.autoplay = true;
      expect(el.hasAttribute('autoplay')).toBe(true);
      expect(el.target!.hasAttribute('autoplay')).toBe(true);
    });

    it('boolean property setter removes the attribute when set to false', () => {
      const el = create(defineVideoElement());
      el.autoplay = true;
      el.autoplay = false;
      expect(el.hasAttribute('autoplay')).toBe(false);
      expect(el.target!.hasAttribute('autoplay')).toBe(false);
    });

    it('string property getter returns the attribute value', () => {
      const el = create(defineVideoElement());
      el.setAttribute('preload', 'auto');
      expect(el.preload).toBe('auto');
    });

    it('string property getter returns false when attribute is absent', () => {
      const el = create(defineVideoElement());
      expect(el.poster).toBe(false);
      expect(el.preload).toBe(false);
    });

    it('string property setter sets the attribute and forwards to target', () => {
      const el = create(defineVideoElement());
      el.poster = 'https://example.com/poster.jpg';
      expect(el.getAttribute('poster')).toBe('https://example.com/poster.jpg');
      expect(el.target!.getAttribute('poster')).toBe('https://example.com/poster.jpg');
    });

    it('string property setter removes attribute when set to null', () => {
      const el = create(defineVideoElement());
      el.poster = 'https://example.com/poster.jpg';
      el.poster = null;
      expect(el.hasAttribute('poster')).toBe(false);
    });

    it('property accessors work for all non-MediaHost video attributes', () => {
      const el = create(defineVideoElement());

      el.controls = true;
      expect(el.controls).toBe(true);
      expect(el.hasAttribute('controls')).toBe(true);

      el.loop = true;
      expect(el.loop).toBe(true);
      expect(el.hasAttribute('loop')).toBe(true);

      el.playsinline = true;
      expect(el.playsinline).toBe(true);
      expect(el.hasAttribute('playsinline')).toBe(true);

      el.poster = 'poster.jpg';
      expect(el.poster).toBe('poster.jpg');
      expect(el.getAttribute('poster')).toBe('poster.jpg');

      el.preload = 'metadata';
      expect(el.preload).toBe('metadata');
      expect(el.getAttribute('preload')).toBe('metadata');

      el.crossOrigin = 'anonymous';
      expect(el.crossOrigin).toBe('anonymous');
      expect(el.getAttribute('crossorigin')).toBe('anonymous');

      el.loading = 'lazy';
      expect(el.loading).toBe('lazy');
      expect(el.getAttribute('loading')).toBe('lazy');
    });

    it('property accessors are defined on the prototype, not the constructor', () => {
      const { Ctor } = defineVideoElement();
      const proto = Ctor.prototype;

      expect(Object.getOwnPropertyDescriptor(proto, 'autoplay')).toBeDefined();
      expect(Object.getOwnPropertyDescriptor(proto, 'controls')).toBeDefined();
      expect(Object.getOwnPropertyDescriptor(proto, 'loop')).toBeDefined();
      expect(Object.getOwnPropertyDescriptor(proto, 'poster')).toBeDefined();
      expect(Object.getOwnPropertyDescriptor(proto, 'preload')).toBeDefined();

      expect(Object.getOwnPropertyDescriptor(Ctor, 'autoplay')).toBeUndefined();
      expect(Object.getOwnPropertyDescriptor(Ctor, 'poster')).toBeUndefined();
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
    it('forwards non-composed media events from the target to the host', () => {
      const el = create(defineVideoElement());
      const handler = vi.fn();

      el.addEventListener('play', handler);
      el.target!.dispatchEvent(new Event('play'));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('removes forwarded listener via removeEventListener', () => {
      const el = create(defineVideoElement());
      const handler = vi.fn();

      el.addEventListener('play', handler);
      el.removeEventListener('play', handler);
      el.target!.dispatchEvent(new Event('play'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('delivers DOM events dispatched directly on the host element', () => {
      const el = create(defineVideoElement());
      const handler = vi.fn();

      el.addEventListener('click', handler);
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('delivers custom events dispatched on the host element', () => {
      const el = create(defineVideoElement());
      const handler = vi.fn();

      el.addEventListener('my-custom-event', handler);
      el.dispatchEvent(new CustomEvent('my-custom-event'));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not double-fire composed events that originate on the target', () => {
      const el = create(defineVideoElement());
      const handler = vi.fn();

      el.addEventListener('click', handler);
      el.target!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

      expect(handler).toHaveBeenCalledOnce();
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

  describe('object-typed properties are excluded from attribute observation', () => {
    it('excludes object-typed properties from observedAttributes', () => {
      const { Ctor } = defineVideoElementWithObjects();
      const observed = Ctor.observedAttributes;
      expect(observed).not.toContain('config');
      expect(observed).toContain('debug');
      expect(observed).toContain('src');
    });

    it('preserves object property when attribute is set', () => {
      const el = create(defineVideoElementWithObjects());
      const original = { startLevel: 2 };
      el.config = original;

      el.setAttribute('config', '{"startLevel": 5}');
      expect(el.config).toBe(original);
    });

    it('still allows object properties to be set via JS', () => {
      const el = create(defineVideoElementWithObjects());
      const newConfig = { startLevel: 3, maxBufferLength: 60 };
      el.config = newConfig;
      expect(el.config).toBe(newConfig);
    });

    it('still observes primitive-typed properties as attributes', () => {
      const el = create(defineVideoElementWithObjects());
      el.setAttribute('debug', '');
      expect(el.debug).toBe(true);
    });
  });

  describe('property setters set attribute and delegate to MediaHost', () => {
    it('string setter sets attribute on the custom element', () => {
      const el = create(defineTrackingVideoElement());
      el.src = 'https://example.com/video.mp4';
      expect(el.getAttribute('src')).toBe('https://example.com/video.mp4');
    });

    it('string setter delegates value to the MediaHost via attributeChangedCallback', () => {
      const el = create(defineTrackingVideoElement());
      el.src = 'https://example.com/video.mp4';
      expect(el.src).toBe('https://example.com/video.mp4');
    });

    it('number setter sets attribute on the custom element', () => {
      const el = create(defineTrackingVideoElement());
      el.volume = 0.5;
      expect(el.getAttribute('volume')).toBe('0.5');
    });

    it('number setter delegates value to the MediaHost via attributeChangedCallback', () => {
      const el = create(defineTrackingVideoElement());
      el.volume = 0.5;
      expect(el.volume).toBe(0.5);
    });

    it('boolean setter toggles attribute on the custom element', () => {
      const el = create(defineTrackingVideoElement());
      el.muted = true;
      expect(el.hasAttribute('muted')).toBe(true);
    });

    it('boolean setter removes attribute when set to false', () => {
      const el = create(defineTrackingVideoElement());
      el.muted = true;
      el.muted = false;
      expect(el.hasAttribute('muted')).toBe(false);
    });

    it('boolean setter delegates value to the MediaHost via attributeChangedCallback', () => {
      const el = create(defineTrackingVideoElement());
      el.muted = true;
      expect(el.muted).toBe(true);

      el.muted = false;
      expect(el.muted).toBe(false);
    });

    it('currentTime setter sets attribute and delegates number value', () => {
      const el = create(defineTrackingVideoElement());
      el.currentTime = 42;
      expect(el.getAttribute('current-time')).toBe('42');
      expect(el.currentTime).toBe(42);
    });

    it('playbackRate setter sets attribute and delegates number value', () => {
      const el = create(defineTrackingVideoElement());
      el.playbackRate = 2;
      expect(el.getAttribute('playback-rate')).toBe('2');
      expect(el.playbackRate).toBe(2);
    });

    it('attribute is set before MediaHost setter is called', () => {
      const el = create(defineTrackingVideoElement());
      const spy = vi.spyOn(el, 'setAttribute');
      el.src = 'video.mp4';

      expect(spy).toHaveBeenCalledWith('src', 'video.mp4');
      expect(spy.mock.invocationCallOrder[0]).toBeLessThan(Number.POSITIVE_INFINITY);
    });

    it('MediaHost setter receives the coerced value for each type', () => {
      const el = create(defineTrackingVideoElement());

      el.src = 'video.mp4';
      el.volume = 0.75;
      el.muted = true;
      el.currentTime = 10;
      el.playbackRate = 1.5;

      expect(el.src).toBe('video.mp4');
      expect(el.volume).toBe(0.75);
      expect(el.muted).toBe(true);
      expect(el.currentTime).toBe(10);
      expect(el.playbackRate).toBe(1.5);
    });

    it('setting the same attribute value does not re-trigger the MediaHost setter', () => {
      const el = create(defineTrackingVideoElement());
      const spy = vi.fn();
      const origSetAttribute = el.setAttribute.bind(el);

      el.setAttribute = (...args: [string, string]) => {
        origSetAttribute(...args);
        spy(...args);
      };

      el.src = 'video.mp4';
      expect(spy).toHaveBeenCalledOnce();
      expect(el.src).toBe('video.mp4');
    });

    it('defaultMuted getter reflects the muted attribute', () => {
      const el = create(defineTrackingVideoElement());
      expect(el.defaultMuted).toBe(false);

      el.setAttribute('muted', '');
      expect(el.defaultMuted).toBe(true);

      el.removeAttribute('muted');
      expect(el.defaultMuted).toBe(false);
    });

    it('defaultMuted setter toggles the muted attribute', () => {
      const el = create(defineTrackingVideoElement());
      el.defaultMuted = true;
      expect(el.hasAttribute('muted')).toBe(true);

      el.defaultMuted = false;
      expect(el.hasAttribute('muted')).toBe(false);
    });

    it('defaultMuted setter triggers the MediaHost muted setter via attributeChangedCallback', () => {
      const el = create(defineTrackingVideoElement());
      el.defaultMuted = true;
      expect(el.muted).toBe(true);

      el.defaultMuted = false;
      expect(el.muted).toBe(false);
    });

    it('muted property setter and defaultMuted share the same attribute', () => {
      const el = create(defineTrackingVideoElement());
      el.muted = true;
      expect(el.defaultMuted).toBe(true);

      el.defaultMuted = false;
      expect(el.muted).toBe(false);
    });

    it('object-typed properties bypass attribute and delegate directly to MediaHost', () => {
      const el = create(defineVideoElementWithObjects());
      const config = { startLevel: 2 };
      el.config = config;

      expect(el.hasAttribute('config')).toBe(false);
      expect(el.config).toBe(config);
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
