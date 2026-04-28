import { LiveButtonCore, LiveButtonDataAttrs, type LiveButtonMediaState } from '@videojs/core';
import {
  applyElementProps,
  applyStateDataAttrs,
  createButton,
  logMissingFeature,
  selectBuffer,
  selectLive,
  selectTime,
} from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import type { State } from '@videojs/store';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

/**
 * `<media-live-button>` — selects from `live`, `time`, and `buffer` features
 * and composes them into the `LiveButtonMediaState` consumed by
 * `LiveButtonCore`.
 *
 * Doesn't extend `MediaButtonElement` because that base couples a button to
 * a single feature selector; the LiveButton needs three.
 */
export class LiveButtonElement extends MediaElement {
  static readonly tagName = 'media-live-button';

  static override properties: PropertyDeclarationMap = {
    label: { type: String },
    disabled: { type: Boolean },
  };

  disabled = false;
  label = '';

  protected readonly core = new LiveButtonCore();

  protected readonly live = new PlayerController(this, playerContext, selectLive);
  protected readonly time = new PlayerController(this, playerContext, selectTime);
  protected readonly buffer = new PlayerController(this, playerContext, selectBuffer);

  get $state(): State<LiveButtonCore.State> {
    return this.core.state;
  }

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    if (!this.textContent?.trim()) {
      this.textContent = LiveButtonCore.defaultText;
    }

    this.#disconnect = new AbortController();

    const buttonProps = createButton({
      onActivate: () => {
        const media = this.#getMedia();
        if (media) this.core.seekToLive(media);
      },
      isDisabled: () => this.disabled || !this.#getMedia(),
    });

    applyElementProps(this, buttonProps, { signal: this.#disconnect.signal });

    if (__DEV__ && !this.#getMedia()) {
      logMissingFeature(this.localName, this.live.displayName ?? 'live');
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  /** Returns the button's current label derived from media state. */
  getLabel(): string | undefined {
    return this.core.state.current.label || undefined;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.core.setProps(this);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.#getMedia();
    if (!media) return;

    this.core.setMedia(media);
    const state = this.core.getState();
    applyElementProps(this, this.core.getAttrs(state));
    applyStateDataAttrs(this, state, LiveButtonDataAttrs);
  }

  /**
   * Compose the LiveButton media state from the three feature slices.
   * Returns `null` when any are missing so the button stays disabled until
   * all three features are registered on the player.
   */
  #getMedia(): LiveButtonMediaState | null {
    const live = this.live.value;
    const time = this.time.value;
    const buffer = this.buffer.value;
    if (!live || !time || !buffer) return null;
    return {
      currentTime: time.currentTime,
      seek: time.seek,
      seekable: buffer.seekable,
      liveEdgeStart: live.liveEdgeStart,
      targetLiveWindow: live.targetLiveWindow,
    };
  }
}
