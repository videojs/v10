/**
 * Mock SPF audio-only adapter mixin — mirrors SimpleHlsAudioOnlyMediaMixin.
 *
 * Exercises:
 *   - Cross-package mixin resolution (host lives in core, mixin in spf)
 *   - Defaults declared in the mixin's own file (spfAudioOnlyMediaDefaultProps)
 *   - `@fires`-declared events: `audiomodechange` also has a dispatch site,
 *     `manifestparsed` is dispatched from a helper the builder never scans —
 *     the @fires tag is its only source.
 */
type Constructor<T = object> = new (...args: any[]) => T;

export const spfAudioOnlyMediaDefaultProps = {
  src: '',
  preload: '',
};

/**
 * Adds SPF audio-only HLS playback to a host.
 *
 * @fires audiomodechange - Fired when the audio-only rendition changes.
 * @fires manifestparsed - Fired after the multivariant playlist is parsed.
 */
export const SpfAudioOnlyMediaMixin = <Base extends Constructor>(BaseClass: Base) => {
  class SpfAudioOnlyMedia extends BaseClass {
    #src: string = spfAudioOnlyMediaDefaultProps.src;
    #preload: string = spfAudioOnlyMediaDefaultProps.preload;

    /** Source URL of the HLS manifest. */
    get src(): string {
      return this.#src;
    }

    set src(value: string) {
      this.#src = value;
      (this as unknown as EventTarget).dispatchEvent(new Event('audiomodechange'));
    }

    /** Preload hint forwarded to the internal audio element. */
    get preload(): string {
      return this.#preload;
    }

    set preload(value: string) {
      this.#preload = value;
    }
  }

  return SpfAudioOnlyMedia as unknown as Base & Constructor<{ src: string; preload: string }>;
};
