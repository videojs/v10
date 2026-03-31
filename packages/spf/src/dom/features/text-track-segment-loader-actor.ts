import type { ActorSnapshot, SignalActor } from '../../core/actor';
import { getSegmentsToLoad } from '../../core/buffer/forward-buffer';
import type { ReadonlySignal } from '../../core/signals/primitives';
import { signal, untrack, update } from '../../core/signals/primitives';
import { SerialRunner, Task } from '../../core/task';
import type { TextTrack } from '../../core/types';
import { parseVttSegment } from '../text/parse-vtt-segment';
import type { TextTracksActor } from './text-tracks-actor';

// =============================================================================
// Types
// =============================================================================

export type TextTrackSegmentLoaderStatus = 'idle' | 'loading' | 'destroyed';

export type TextTrackSegmentLoaderSnapshot = ActorSnapshot<TextTrackSegmentLoaderStatus, object>;

export type TextTrackSegmentLoaderMessage = {
  type: 'load';
  track: TextTrack;
  currentTime: number;
};

// =============================================================================
// Implementation
// =============================================================================

/**
 * Loads VTT segments for a text track and delegates cue management to a
 * TextTracksActor. Mirrors the SegmentLoaderActor/SourceBufferActor pattern
 * for the text track equivalent.
 *
 * Planning is done in send(): segments already recorded in TextTracksActor's
 * context are skipped. Each new send() preempts in-flight work via abortAll()
 * before scheduling fresh tasks.
 */
export class TextTrackSegmentLoaderActor implements SignalActor<TextTrackSegmentLoaderStatus, object> {
  readonly #textTracksActor: TextTracksActor;
  readonly #snapshotSignal = signal<TextTrackSegmentLoaderSnapshot>({
    status: 'idle',
    context: {},
  });
  readonly #runner = new SerialRunner();
  #loadGeneration = 0;

  constructor(textTracksActor: TextTracksActor) {
    this.#textTracksActor = textTracksActor;
  }

  get snapshot(): ReadonlySignal<TextTrackSegmentLoaderSnapshot> {
    return this.#snapshotSignal;
  }

  send(message: TextTrackSegmentLoaderMessage): void {
    const { track, currentTime } = message;
    const trackId = track.id;

    // Plan: determine which segments still need loading.
    // TextTracksActor owns the authoritative record of loaded segments.
    // untrack() covers both reads: the Actor's own status and the TextTracksActor's
    // snapshot — neither should subscribe the calling Reactor's effect.
    const [isDestroyed, bufferedSegments] = untrack(() => {
      const status = this.#snapshotSignal.get().status;
      const segments = this.#textTracksActor.snapshot.get().context.segments[trackId] ?? [];
      return [status === 'destroyed', segments] as const;
    });
    if (isDestroyed) return;
    const segmentsToLoad = getSegmentsToLoad(track.segments, bufferedSegments, currentTime);

    // Preempt any in-flight work before scheduling the new plan.
    this.#runner.abortAll();

    if (segmentsToLoad.length === 0) {
      update(this.#snapshotSignal, { status: 'idle' });
      return;
    }

    const generation = ++this.#loadGeneration;
    update(this.#snapshotSignal, { status: 'loading' });

    // Capture actor reference so Tasks close over it, not `this`.
    const textTracksActor = this.#textTracksActor;

    const promises = segmentsToLoad.map((segment) =>
      this.#runner.schedule(
        new Task(async (signal) => {
          if (signal.aborted) return;
          try {
            const cues = await parseVttSegment(segment.url);
            if (signal.aborted) return;
            textTracksActor.send({
              type: 'add-cues',
              meta: { trackId, id: segment.id, startTime: segment.startTime, duration: segment.duration },
              cues,
            });
          } catch (error) {
            // Graceful degradation: log and continue to the next segment.
            console.error('Failed to load VTT segment:', error);
          }
        })
      )
    );

    // Transition to idle once all tasks in this generation complete.
    // The generation check prevents a stale transition if a new send() arrived.
    Promise.all(promises)
      .then(() => {
        if (this.#snapshotSignal.get().status === 'destroyed' || this.#loadGeneration !== generation) return;
        update(this.#snapshotSignal, { status: 'idle' });
      })
      .catch(() => {
        // Tasks handle their own errors; this catch prevents unhandled rejection
        // in the unlikely event a Task throws despite the internal try/catch.
      });
  }

  destroy(): void {
    if (this.#snapshotSignal.get().status === 'destroyed') return;
    this.#runner.destroy();
    update(this.#snapshotSignal, { status: 'destroyed' });
  }
}
