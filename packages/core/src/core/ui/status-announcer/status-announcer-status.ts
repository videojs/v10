import type { MediaSnapshot } from '../input-action/input-action';
import { formatVolumeValue } from '../volume-indicator/volume-indicator-status';
import { DEFAULT_STATUS_ANNOUNCER_LABELS, type StatusAnnouncerLabels } from './status-announcer-labels';

export function deriveStatusAnnouncement(
  previous: MediaSnapshot,
  snapshot: MediaSnapshot,
  labels: StatusAnnouncerLabels = DEFAULT_STATUS_ANNOUNCER_LABELS
): string | null {
  const announcements: string[] = [];

  if (hasChanged(previous.paused, snapshot.paused)) {
    announcements.push(snapshot.paused ? labels.paused : labels.playing);
  }

  if (hasChanged(previous.subtitlesShowing, snapshot.subtitlesShowing) && snapshot.subtitlesAvailable !== false) {
    announcements.push(snapshot.subtitlesShowing ? labels.captionsOn : labels.captionsOff);
  }

  if (hasChanged(previous.fullscreen, snapshot.fullscreen)) {
    announcements.push(snapshot.fullscreen ? labels.fullscreen : labels.exitFullscreen);
  }

  if (hasChanged(previous.pip, snapshot.pip)) {
    announcements.push(snapshot.pip ? labels.pictureInPicture : labels.exitPictureInPicture);
  }

  if (hasChanged(previous.playbackRate, snapshot.playbackRate)) {
    announcements.push(labels.playbackRate(`${snapshot.playbackRate}×`));
  }

  return announcements.length > 0 ? announcements.join('. ') : null;
}

export function deriveVolumeAnnouncement(
  previous: MediaSnapshot,
  snapshot: MediaSnapshot,
  labels: StatusAnnouncerLabels = DEFAULT_STATUS_ANNOUNCER_LABELS
): string | null {
  if (!hasChanged(previous.volume, snapshot.volume) && !hasChanged(previous.muted, snapshot.muted)) return null;

  const volume = snapshot.volume ?? previous.volume;
  const muted = snapshot.muted ?? previous.muted;

  if (volume === undefined && muted === undefined) return null;
  return muted || (volume ?? 0) <= 0 ? labels.muted : labels.volumeWithValue(formatVolumeValue(volume ?? 0));
}

function hasChanged<Value>(previous: Value | undefined, next: Value | undefined): next is Value {
  return previous !== undefined && next !== undefined && !Object.is(previous, next);
}
