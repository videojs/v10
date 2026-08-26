import type { ReactiveController, ReactiveControllerHost } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import { isMediaTextTrackCapable, type Media, type TextCueLike, type TextTrackLike } from '@videojs/media';
import {
  type CreateTextTrackOptions,
  createTextTrack,
  getTextTrackCues,
  type TextTrackHandle,
  type TextTrackKindFilter,
  watchActiveTextTrack,
  watchTextTrackCues,
} from '@videojs/media/dom';
import { noop } from '@videojs/utils/function';
import { isString } from '@videojs/utils/predicate';

import { mediaContext } from './context';

export type TextTrackControllerHost = ReactiveControllerHost & HTMLElement;
export type TextTrackControllerSource = CreateTextTrackOptions | TextTrackKindFilter;

/**
 * Create a programmatic text track or observe the active track for a kind, including reactive cue snapshots.
 *
 * An active native track has any mode other than `disabled`; this includes `hidden` chapter and metadata tracks whose
 * cues update without being rendered.
 *
 * @example
 *   ```ts
 *   class MetadataConsumer extends UIElement {
 *     #track = new TextTrackController(this, {
 *       kind: 'metadata',
 *       label: 'ad-cues',
 *     });
 *
 *     protected override update() {
 *       console.log(this.#track.activeCues);
 *     }
 *   }
 *   ```;
 */
export class TextTrackController implements ReactiveController {
  readonly #host: TextTrackControllerHost;
  readonly #source: TextTrackControllerSource;
  readonly #consumer: ContextConsumer<typeof mediaContext, TextTrackControllerHost>;

  #connected = false;
  #media: Media | null = null;
  #handle: TextTrackHandle | null = null;
  #track: TextTrackLike | null = null;
  #cues: TextCueLike[] = [];
  #activeCues: TextCueLike[] = [];
  #stopTrack = noop;
  #stopCues = noop;

  /**
   * Create a text track owned by this controller.
   *
   * @param host - The host element that owns this controller.
   * @param source - Track metadata and initial mode.
   * @label Created Track
   */
  constructor(host: TextTrackControllerHost, source: CreateTextTrackOptions);
  /**
   * Observe the active text track matching one or more kinds.
   *
   * @param host - The host element that owns this controller.
   * @param source - Text track kind or kinds to match.
   * @label Active Track
   */
  constructor(host: TextTrackControllerHost, source: TextTrackKindFilter);
  constructor(host: TextTrackControllerHost, source: TextTrackControllerSource) {
    this.#host = host;
    this.#source = source;
    this.#consumer = new ContextConsumer(host, {
      context: mediaContext,
      subscribe: true,
      callback: (value) => {
        this.#media = value.media;

        if (this.#connected) this.#connect();
      },
    });

    host.addController(this);
  }

  /** The created or active text track. */
  get value(): TextTrackLike | null {
    return this.#track;
  }

  /** A fresh snapshot of every cue on the current track. */
  get cues(): TextCueLike[] {
    return this.#cues;
  }

  /** A fresh snapshot of the cues active at the current playback position. */
  get activeCues(): TextCueLike[] {
    return this.#activeCues;
  }

  /** Add a cue to the current track and refresh the controller snapshots. */
  addCue(cue: TextCueLike): void {
    this.#track?.addCue?.(cue);
    this.#syncCues();
  }

  /** Remove a cue from the current track and refresh the controller snapshots. */
  removeCue(cue: TextCueLike): void {
    this.#track?.removeCue?.(cue);
    this.#syncCues();
  }

  hostConnected(): void {
    this.#connected = true;
    this.#media = this.#consumer.value?.media ?? null;
    this.#connect();
  }

  hostDisconnected(): void {
    this.#connected = false;
    this.#teardown();
  }

  hostDestroyed(): void {
    this.#connected = false;
    this.#teardown();
  }

  #connect(): void {
    this.#teardown();

    const media = this.#media;
    if (!isMediaTextTrackCapable(media)) return;

    if (isCreateOptions(this.#source)) {
      this.#handle = createTextTrack(media, this.#source);
      this.#setTrack(this.#handle?.track ?? null);
      return;
    }

    this.#stopTrack = watchActiveTextTrack(media, this.#source, (track) => this.#setTrack(track));
  }

  #setTrack(track: TextTrackLike | null): void {
    this.#stopCues();
    this.#stopCues = noop;
    this.#track = track;

    if (track) {
      this.#stopCues = watchTextTrackCues(this.#media, track, false, () => {
        this.#syncCues();
      });
    } else {
      this.#syncCues();
    }
  }

  #syncCues(): void {
    this.#cues = getTextTrackCues(this.#track);
    this.#activeCues = getTextTrackCues(this.#track, true);
    this.#host.requestUpdate();
  }

  #teardown(): void {
    const hadValue = Boolean(this.#track || this.#cues.length || this.#activeCues.length);

    this.#stopTrack();
    this.#stopTrack = noop;
    this.#stopCues();
    this.#stopCues = noop;
    this.#handle?.destroy();
    this.#handle = null;
    this.#track = null;
    this.#cues = [];
    this.#activeCues = [];

    if (this.#connected && hadValue) this.#host.requestUpdate();
  }
}

function isCreateOptions(source: TextTrackControllerSource): source is CreateTextTrackOptions {
  return !isString(source) && !Array.isArray(source);
}

export namespace TextTrackController {
  export type Host = TextTrackControllerHost;
  export type Source = TextTrackControllerSource;
}
