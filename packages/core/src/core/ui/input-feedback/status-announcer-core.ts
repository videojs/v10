import { createState } from '@videojs/store';

import type { IndicatorCoreProps } from './indicator-lifecycle';
import { getIndicatorCloseDelay, IndicatorCloseController } from './indicator-lifecycle';
import {
  DEFAULT_STATUS_ANNOUNCER_LABELS,
  deriveAnnouncerLabel,
  formatPlaybackRateAnnouncerLabel,
  formatSeekAnnouncerLabel,
  formatVolumeValue,
  type InputActionEvent,
  type MediaSnapshot,
  type StatusAnnouncerLabels,
} from './status';

const SNAPSHOT_ANNOUNCER_DEBOUNCE = 200;

export interface StatusAnnouncerProps extends IndicatorCoreProps {
  labels?: Partial<StatusAnnouncerLabels> | undefined;
  shouldAnnounceSeek?: ((snapshot: MediaSnapshot) => boolean) | undefined;
  shouldAnnounceVolume?: ((snapshot: MediaSnapshot) => boolean) | undefined;
}

export interface StatusAnnouncerState {
  label: string | null;
}

export class StatusAnnouncerCore {
  readonly state = createState<StatusAnnouncerState>({ label: null });

  #props: StatusAnnouncerProps = {};
  #snapshot: MediaSnapshot | null = null;
  #seekStartTime: number | null = null;
  #seekTargetTime: number | null = null;
  #seekTimer: ReturnType<typeof setTimeout> | null = null;
  #volumeTimer: ReturnType<typeof setTimeout> | null = null;
  #close = new IndicatorCloseController(
    () => this.state.patch({ label: null }),
    () => getIndicatorCloseDelay(this.#props)
  );

  setProps(props: StatusAnnouncerProps): void {
    this.#props = props;
  }

  resetSnapshot(): void {
    this.#snapshot = null;
    this.#seekStartTime = null;
    this.#seekTargetTime = null;
    this.#clearSeekTimer();
    this.#clearVolumeTimer();
    this.#close.close();
  }

  destroy(): void {
    this.#clearSeekTimer();
    this.#clearVolumeTimer();
    this.#close.destroy();
  }

  processEvent(event: InputActionEvent, snapshot: MediaSnapshot): boolean {
    const label = deriveAnnouncerLabel(event, snapshot, {
      ...DEFAULT_STATUS_ANNOUNCER_LABELS,
      ...this.#props.labels,
    });
    if (!label) return false;

    this.#announce(label);
    return true;
  }

  processSnapshot(snapshot: MediaSnapshot): boolean {
    const previous = this.#snapshot;
    this.#snapshot = snapshot;

    if (!previous) return false;

    const labels = this.#getLabels();
    let accepted = false;

    if (hasChanged(previous.paused, snapshot.paused)) {
      accepted = this.#announce(snapshot.paused ? labels.paused : labels.playing);
    }

    if (hasChanged(previous.subtitlesShowing, snapshot.subtitlesShowing) && snapshot.subtitlesAvailable !== false) {
      accepted = this.#announce(snapshot.subtitlesShowing ? labels.captionsOn : labels.captionsOff);
    }

    if (hasChanged(previous.fullscreen, snapshot.fullscreen)) {
      accepted = this.#announce(snapshot.fullscreen ? labels.fullscreen : labels.exitFullscreen);
    }

    if (hasChanged(previous.pip, snapshot.pip)) {
      accepted = this.#announce(snapshot.pip ? labels.pictureInPicture : labels.exitPictureInPicture);
    }

    if (hasChanged(previous.playbackRate, snapshot.playbackRate)) {
      accepted = this.#announce(formatPlaybackRateAnnouncerLabel(snapshot.playbackRate, labels));
    }

    if (this.#processVolumeSnapshot(previous, snapshot, labels)) {
      accepted = true;
    }

    if (this.#processSeekSnapshot(previous, snapshot, labels)) {
      accepted = true;
    }

    return accepted;
  }

  #getLabels(): StatusAnnouncerLabels {
    return {
      ...DEFAULT_STATUS_ANNOUNCER_LABELS,
      ...this.#props.labels,
    };
  }

  #announce(label: string): boolean {
    this.state.patch({ label });
    this.#close.arm();
    return true;
  }

  #processVolumeSnapshot(previous: MediaSnapshot, snapshot: MediaSnapshot, labels: StatusAnnouncerLabels): boolean {
    if (!hasChanged(previous.volume, snapshot.volume) && !hasChanged(previous.muted, snapshot.muted)) return false;
    if (this.#props.shouldAnnounceVolume?.(snapshot) === false) return false;

    const volume = snapshot.volume ?? previous.volume;
    const muted = snapshot.muted ?? previous.muted;

    if (volume === undefined && muted === undefined) return false;

    const label = muted || (volume ?? 0) <= 0 ? labels.muted : `${labels.volume} ${formatVolumeValue(volume ?? 0)}`;
    this.#scheduleVolumeAnnouncement(label);
    return true;
  }

  #processSeekSnapshot(previous: MediaSnapshot, snapshot: MediaSnapshot, labels: StatusAnnouncerLabels): boolean {
    if (previous.seeking !== true && snapshot.seeking === true) {
      this.#seekStartTime = previous.currentTime ?? null;
      this.#seekTargetTime = snapshot.currentTime ?? null;
      this.#clearSeekTimer();
      return false;
    }

    if (snapshot.seeking === true) {
      this.#seekTargetTime = snapshot.currentTime ?? this.#seekTargetTime;
      return false;
    }

    if (previous.seeking !== true || snapshot.seeking !== false) return false;

    const targetTime = snapshot.currentTime ?? this.#seekTargetTime;
    const startTime = this.#seekStartTime;
    this.#seekStartTime = null;
    this.#seekTargetTime = null;

    if (targetTime === undefined || targetTime === null || Object.is(targetTime, startTime)) return false;
    if (this.#props.shouldAnnounceSeek?.(snapshot) === false) return false;

    this.#scheduleSeekAnnouncement(formatSeekAnnouncerLabel(targetTime, labels));
    return true;
  }

  #scheduleVolumeAnnouncement(label: string): void {
    this.#clearVolumeTimer();
    this.#volumeTimer = setTimeout(() => {
      this.#volumeTimer = null;
      this.#announce(label);
    }, SNAPSHOT_ANNOUNCER_DEBOUNCE);
  }

  #scheduleSeekAnnouncement(label: string): void {
    this.#clearSeekTimer();
    this.#seekTimer = setTimeout(() => {
      this.#seekTimer = null;
      this.#announce(label);
    }, SNAPSHOT_ANNOUNCER_DEBOUNCE);
  }

  #clearSeekTimer(): void {
    if (!this.#seekTimer) return;
    clearTimeout(this.#seekTimer);
    this.#seekTimer = null;
  }

  #clearVolumeTimer(): void {
    if (!this.#volumeTimer) return;
    clearTimeout(this.#volumeTimer);
    this.#volumeTimer = null;
  }
}

export namespace StatusAnnouncerCore {
  export type Props = StatusAnnouncerProps;
  export type State = StatusAnnouncerState;
}

function hasChanged<Value>(previous: Value | undefined, next: Value | undefined): next is Value {
  return previous !== undefined && next !== undefined && !Object.is(previous, next);
}
