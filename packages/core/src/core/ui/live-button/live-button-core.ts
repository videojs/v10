import { createState } from '@videojs/store';
import { defaults } from '@videojs/utils/object';
import { isFunction } from '@videojs/utils/predicate';
import type { NonNullableObject } from '@videojs/utils/types';

import type { MediaBufferState, MediaLiveState, MediaTimeState } from '../../media/state';
import type { ButtonState } from '../types';

export interface LiveButtonProps {
  /** Custom label for the button. */
  label?: string | ((state: LiveButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}

/**
 * Fallback offset (in seconds) from the end of the seekable window used to
 * decide "at live edge" when `liveEdgeStart` is unavailable.
 */
const LIVE_EDGE_OFFSET = 10;

/**
 * Grace window (in seconds) before `liveEdgeStart` that still counts as
 * "at the live edge". Absorbs the small gap between the player's initial
 * playback position (e.g. hls.js `liveSyncDuration`) and the manifest's
 * `HOLD-BACK`, so autoplay reliably reports live.
 */
const LIVE_EDGE_TOLERANCE = 5;

/**
 * Media state slice consumed by `LiveButtonCore` — composed by the HTML
 * and React `LiveButton` adapters from the `live`, `time`, and `buffer`
 * store slices.
 */
export type LiveButtonMediaState = Pick<MediaTimeState, 'currentTime' | 'seek'> &
  Pick<MediaBufferState, 'seekable'> &
  MediaLiveState;

export interface LiveButtonState extends ButtonState {
  /** Whether the stream is live (or DVR). */
  live: boolean;
  /** Whether playback is at the live edge. */
  liveEdge: boolean;
}

/**
 * Core state machine for a "Live" button. Indicates whether the player is
 * playing at the live edge and seeks to the Seekable Live Edge when activated.
 *
 * @see https://github.com/video-dev/media-ui-extensions/blob/main/proposals/0007-live-edge.md
 */
export class LiveButtonCore {
  /**
   * Default visible text. Auto-inserted by `media-live-button` and `<LiveButton>`
   * when no children are provided. Override globally for i18n:
   *
   * ```ts
   * LiveButtonCore.defaultText = 'En Vivo';
   * ```
   */
  static defaultText = 'Live';

  static readonly defaultProps: NonNullableObject<LiveButtonProps> = {
    label: '',
    disabled: false,
  };

  readonly state = createState<LiveButtonState>({
    live: false,
    liveEdge: false,
    label: '',
  });

  #props = { ...LiveButtonCore.defaultProps };
  #media: LiveButtonMediaState | null = null;

  constructor(props?: LiveButtonProps) {
    if (props) this.setProps(props);
  }

  setProps(props: LiveButtonProps): void {
    this.#props = defaults(props, LiveButtonCore.defaultProps);
  }

  getLabel(state: LiveButtonState): string {
    const { label } = this.#props;

    if (isFunction(label)) {
      const customLabel = label(state);
      if (customLabel) return customLabel;
    } else if (label) {
      return label;
    }

    if (state.liveEdge) return 'Playing live';
    return 'Seek to live edge';
  }

  getAttrs(state: LiveButtonState) {
    const inactive = this.#props.disabled || state.liveEdge;
    return {
      'aria-label': this.getLabel(state),
      'aria-disabled': inactive ? 'true' : undefined,
    };
  }

  setMedia(media: LiveButtonMediaState): void {
    this.#media = media;
  }

  getState(): LiveButtonState {
    const media = this.#media!;
    const live = isLiveMedia(media);
    const liveEdge = live && this.#isAtLiveEdge(media);

    this.state.patch({ live, liveEdge });
    this.state.patch({ label: this.getLabel(this.state.current) });

    return this.state.current;
  }

  /** Seek to the Seekable Live Edge. No-op when not live or already at edge. */
  async seekToLive(media: LiveButtonMediaState): Promise<void> {
    if (this.#props.disabled) return;
    if (!isLiveMedia(media)) return;
    if (this.#isAtLiveEdge(media)) return;

    const target = liveEdgeTarget(media);
    if (target == null) return;

    await media.seek(target);
  }

  #isAtLiveEdge(media: LiveButtonMediaState): boolean {
    const { currentTime, liveEdgeStart } = media;
    if (Number.isFinite(liveEdgeStart)) {
      return currentTime >= liveEdgeStart - LIVE_EDGE_TOLERANCE;
    }

    // Fallback: treat the trailing `LIVE_EDGE_OFFSET` window as the live edge.
    const target = liveEdgeTarget(media);
    if (target == null) return false;
    return currentTime >= target - LIVE_EDGE_OFFSET;
  }
}

export namespace LiveButtonCore {
  export type Props = LiveButtonProps;
  export type State = LiveButtonState;
  export type MediaState = LiveButtonMediaState;
}

function isLiveMedia(media: LiveButtonMediaState): boolean {
  // `targetLiveWindow` is `0` for low-latency live, `Infinity` for DVR, and
  // `NaN` for on-demand or unknown — finite-or-infinite means live.
  return !Number.isNaN(media.targetLiveWindow);
}

function liveEdgeTarget(media: LiveButtonMediaState): number | null {
  const { seekable } = media;
  if (seekable.length === 0) return null;
  const end = seekable[seekable.length - 1]![1];
  return Number.isFinite(end) ? end : null;
}
