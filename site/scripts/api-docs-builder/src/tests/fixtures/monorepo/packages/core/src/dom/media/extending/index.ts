/**
 * Mock extending host — mirrors MuxVideoMedia extending HlsMedia.
 *
 * Exercises: host inheritance. The builder must walk the extends chain
 * to extract properties from both this class and its parent (ComplexHost).
 * Child properties override parent properties of the same name. Defaults
 * spread the parent's defaultProps (mirrors muxMediaDefaultProps) — the
 * builder must resolve the spread through the import. `customDomain`
 * deliberately has no default.
 */
import { ComplexHost, complexMediaDefaultProps } from '../complex';

export const extendingMediaDefaultProps = {
  ...complexMediaDefaultProps,
  playbackId: '',
  tokens: { drm: '' },
  maxResolution: 1080,
};

export class ExtendingHost extends ComplexHost {
  #playbackId: string = '';
  #customDomain: string = '';
  #tokens: Record<string, string> = { ...extendingMediaDefaultProps.tokens };
  #maxResolution: number = extendingMediaDefaultProps.maxResolution;

  /** The playback ID for the video. */
  get playbackId(): string {
    return this.#playbackId;
  }

  set playbackId(value: string) {
    this.#playbackId = value;
  }

  /** Custom domain for asset delivery. */
  get customDomain(): string {
    return this.#customDomain;
  }

  set customDomain(value: string) {
    this.#customDomain = value;
  }

  /** Playback tokens keyed by purpose. */
  get tokens(): Record<string, string> {
    return this.#tokens;
  }

  set tokens(value: Record<string, string>) {
    this.#tokens = value;
  }

  /** Maximum rendition height to request. */
  get maxResolution(): number {
    return this.#maxResolution;
  }

  set maxResolution(value: number) {
    this.#maxResolution = value;
  }

  /** Overrides parent debug — adds network logging. */
  get debug(): boolean {
    return super.debug;
  }

  set debug(value: boolean) {
    super.debug = value;
  }
}
