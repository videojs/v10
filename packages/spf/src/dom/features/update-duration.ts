import { effect } from '../../core/signals/effect';
import type { ReadonlySignal, Signal } from '../../core/signals/primitives';
import type { Presentation } from '../../core/types';
import { hasPresentationDuration } from '../../core/types';

export interface DurationUpdateState {
  presentation?: Presentation;
}

export interface DurationUpdateOwners {
  mediaSource?: MediaSource;
  /** Reactive mirror of `mediaSource.readyState` — updated via DOM events. */
  mediaSourceReadyState?: ReadonlySignal<MediaSource['readyState']>;
  videoSourceBuffer?: SourceBuffer;
  audioSourceBuffer?: SourceBuffer;
}

/**
 * Check if we can update MediaSource duration (have required data).
 */
export function canUpdateDuration(state: DurationUpdateState, owners: DurationUpdateOwners): boolean {
  return !!(owners.mediaSource && state.presentation && hasPresentationDuration(state.presentation));
}

/**
 * Get the maximum buffered end time across all SourceBuffers.
 */
export function getMaxBufferedEnd(owners: DurationUpdateOwners): number {
  let maxEnd = 0;

  const buffers = [owners.videoSourceBuffer, owners.audioSourceBuffer].filter(
    (buf): buf is SourceBuffer => buf !== undefined
  );

  for (const buffer of buffers) {
    const { buffered } = buffer;
    if (buffered.length > 0) {
      const end = buffered.end(buffered.length - 1);
      if (end > maxEnd) {
        maxEnd = end;
      }
    }
  }

  return maxEnd;
}

/**
 * Check if we should update MediaSource duration (conditions met).
 */
export function shouldUpdateDuration(state: DurationUpdateState, owners: DurationUpdateOwners): boolean {
  if (!canUpdateDuration(state, owners)) return false;

  const { mediaSource } = owners;
  const { presentation } = state;

  // MediaSource must be open — use reactive readyState signal when available
  // so the effect re-evaluates when readyState changes from 'closed' to 'open'.
  const readyState = owners.mediaSourceReadyState?.get() ?? owners.mediaSource?.readyState;
  if (readyState !== 'open') return false;

  const duration = presentation!.duration!;

  // Validate duration: finite, positive, not NaN
  if (!Number.isFinite(duration) || Number.isNaN(duration) || duration <= 0) return false;

  // Only set duration on initial MediaSource setup, when it hasn't been set yet.
  // A freshly opened MediaSource has duration === NaN. Once set (either by this
  // task or by endOfStreamTask from buffered.end()), we leave it alone — attempting
  // to re-sync a slight drift between mediaSource.duration and presentation.duration
  // races with concurrent appendBuffer() calls from loadSegmentsTask.
  return Number.isNaN(mediaSource!.duration);
}

/**
 * Wait for all currently-updating SourceBuffers to finish.
 *
 * The MSE spec forbids setting MediaSource.duration while any attached
 * SourceBuffer has updating === true. This defers until all are idle.
 */
function waitForSourceBuffersReady(owners: DurationUpdateOwners): Promise<void> {
  const updating = [owners.videoSourceBuffer, owners.audioSourceBuffer].filter(
    (buf): buf is SourceBuffer => buf?.updating === true
  );

  if (updating.length === 0) return Promise.resolve();

  return Promise.all(
    updating.map(
      (buf) => new Promise<void>((resolve) => buf.addEventListener('updateend', () => resolve(), { once: true }))
    )
  ).then(() => undefined);
}

/**
 * Update MediaSource duration when presentation duration becomes available.
 */
export function updateDuration<S extends DurationUpdateState, O extends DurationUpdateOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): () => void {
  let destroyed = false;
  let running = false;

  const cleanupEffect = effect(() => {
    const currentState = state.get();
    const currentOwners = owners.get();

    if (!shouldUpdateDuration(currentState, currentOwners) || running) return;

    const { mediaSource } = currentOwners;
    running = true;

    // MSE spec: duration cannot be set while any SourceBuffer is updating.
    // Capture the snapshot; the async helper does not read signals.
    waitForSourceBuffersReady(currentOwners)
      .then(() => {
        // Re-check after async wait: destroyed, or readyState changed (e.g. endOfStream
        // already called endOfStream(), transitioning 'open' → 'ended').
        if (destroyed || mediaSource!.readyState !== 'open') return;

        let duration = currentState.presentation!.duration!;

        // MSE spec: duration cannot be less than any buffered range.
        // If buffered ranges exceed calculated duration, extend to match.
        const maxBufferedEnd = getMaxBufferedEnd(currentOwners);
        if (maxBufferedEnd > duration) {
          duration = maxBufferedEnd;
        }

        mediaSource!.duration = duration;
      })
      .finally(() => {
        running = false;
      });
  });

  return () => {
    destroyed = true;
    cleanupEffect();
  };
}
