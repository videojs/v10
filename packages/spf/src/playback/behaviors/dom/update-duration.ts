import { defineBehavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import { type ReadonlySignal, snapshot } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';
import { hasPresentationDuration } from '../../../media/types';

export interface DurationUpdateState {
  presentation?: MaybeResolvedPresentation;
  /** Reactive mirror of `mediaSource.readyState` — updated via DOM events. */
  mediaSourceReadyState?: MediaSource['readyState'];
}

export interface DurationUpdateContext {
  mediaSource?: MediaSource;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
}

/**
 * Check if we can update MediaSource duration (have required data).
 */
export function canUpdateDuration(state: DurationUpdateState, context: DurationUpdateContext): boolean {
  return !!(context.mediaSource && state.presentation && hasPresentationDuration(state.presentation));
}

/**
 * Get the maximum buffered end time across all SourceBuffers.
 */
export function getMaxBufferedEnd(context: DurationUpdateContext): number {
  let maxEnd = 0;

  const buffers = [context.videoBuffer, context.audioBuffer].filter((buf): buf is SourceBuffer => buf !== undefined);

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
export function shouldUpdateDuration(state: DurationUpdateState, context: DurationUpdateContext): boolean {
  if (!canUpdateDuration(state, context)) return false;

  const { mediaSource } = context;
  const { presentation } = state;

  // MediaSource must be open — read from state.mediaSourceReadyState so the
  // effect re-evaluates when readyState changes from 'closed' to 'open'.
  if (state.mediaSourceReadyState !== 'open') return false;

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
function waitForSourceBuffersReady(context: DurationUpdateContext): Promise<void> {
  const updating = [context.videoBuffer, context.audioBuffer].filter(
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
function updateDurationSetup({
  state,
  context,
}: {
  state: {
    presentation: ReadonlySignal<DurationUpdateState['presentation']>;
    mediaSourceReadyState: ReadonlySignal<DurationUpdateState['mediaSourceReadyState']>;
  };
  context: {
    mediaSource: ReadonlySignal<DurationUpdateContext['mediaSource']>;
    videoBuffer: ReadonlySignal<DurationUpdateContext['videoBuffer']>;
    audioBuffer: ReadonlySignal<DurationUpdateContext['audioBuffer']>;
  };
}): () => void {
  let destroyed = false;
  let running = false;

  const cleanupEffect = effect(() => {
    const currentState = snapshot(state);
    const currentContext = snapshot(context);

    if (!shouldUpdateDuration(currentState, currentContext) || running) return;

    const { mediaSource } = currentContext;
    running = true;

    // MSE spec: duration cannot be set while any SourceBuffer is updating.
    // Capture the snapshot; the async helper does not read signals.
    waitForSourceBuffersReady(currentContext)
      .then(() => {
        // Re-check after async wait: destroyed, or readyState changed (e.g. endOfStream
        // already called endOfStream(), transitioning 'open' → 'ended').
        if (destroyed || mediaSource!.readyState !== 'open') return;

        let duration = currentState.presentation!.duration!;

        // MSE spec: duration cannot be less than any buffered range.
        // If buffered ranges exceed calculated duration, extend to match.
        const maxBufferedEnd = getMaxBufferedEnd(currentContext);
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

export const updateDuration = defineBehavior({
  stateKeys: ['presentation', 'mediaSourceReadyState'],
  contextKeys: ['mediaSource', 'videoBuffer', 'audioBuffer'],
  setup: updateDurationSetup,
});
