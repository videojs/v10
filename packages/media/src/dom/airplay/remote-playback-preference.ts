import type { HTMLMediaTargetLike, MediaComponent } from '../media-host';

const DEFAULT = false;

/**
 * Owns `disableRemotePlayback` on the media host so author intent can be told
 * apart from programmatic writers (hls.js / ManagedMediaSource, the AirPlay
 * bridge). Writes through the host API are recorded as author intent and
 * forwarded to the element; direct element writes bypass this component.
 */
export class RemotePlaybackPreference implements MediaComponent {
  #explicit: boolean | undefined;
  #target: HTMLMediaTargetLike | null = null;
  #override: Partial<HTMLMediaTargetLike>;

  constructor() {
    const self = this;
    this.#override = {
      get disableRemotePlayback() {
        return self.#explicit ?? self.#target?.disableRemotePlayback ?? DEFAULT;
      },
      set disableRemotePlayback(value: boolean) {
        self.#explicit = value;
        if (self.#target) self.#target.disableRemotePlayback = value;
      },
    };
  }

  attach(target: HTMLMediaTargetLike) {
    this.#target = target;
    if (this.#explicit !== undefined) target.disableRemotePlayback = this.#explicit;
  }

  detach() {
    this.#target = null;
  }

  get targetOverride() {
    return this.#override;
  }

  get developerWantsDisabled(): boolean {
    return this.#explicit === true;
  }
}
