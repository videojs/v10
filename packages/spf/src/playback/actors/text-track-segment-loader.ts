import type { CallbackActor } from '../../core/actors/actor';
import { untrack } from '../../core/signals/primitives';
import { SerialRunner, Task } from '../../core/tasks/task';
import { getSegmentsToLoad } from '../../media/buffer/forward-buffer';
import type { Cue, TextTrack } from '../../media/types';
import type { TextTracksActor } from './text-tracks';

// =============================================================================
// Message / actor types
// =============================================================================

export type TextTrackSegmentLoaderMessage = {
  type: 'load';
  track: TextTrack;
  currentTime: number;
};

export type TextTrackSegmentLoaderActor = CallbackActor<TextTrackSegmentLoaderMessage>;

/**
 * Resolves a text-track segment URL into the array of cues it contains.
 *
 * "Resolve" because the fn covers both network fetch and parse into the
 * domain model. Host-agnostic — the concrete resolver (e.g. the
 * browser's native VTT resolver) is supplied at engine-assembly time,
 * so this actor stays DOM-free.
 */
export type TextTrackSegmentResolver<C extends Cue = Cue> = (url: string) => Promise<C[]>;

// =============================================================================
// Implementation
// =============================================================================

/**
 * Loads text-track segments for a track and delegates cue management
 * to a TextTracksActor. Mirrors the SegmentLoaderActor/SourceBufferActor
 * pattern for the text-track equivalent.
 *
 * Planning is done in the load handler: segments already recorded in
 * TextTracksActor's context are skipped. Each load preempts in-flight
 * work via abortAll() before scheduling fresh tasks.
 *
 * The cue parser is injected so this factory is host-agnostic. A DOM
 * host supplies a VTT parser backed by `<track>`/`TextTrack` APIs; a
 * non-DOM host (worker, test fake, alternate runtime) supplies its own.
 */
export function createTextTrackSegmentLoaderActor<C extends Cue>(
  textTracksActor: TextTracksActor<C>,
  resolveSegment: TextTrackSegmentResolver<C>
): TextTrackSegmentLoaderActor {
  const runner = new SerialRunner();
  let destroyed = false;

  return {
    send({ track, currentTime }: TextTrackSegmentLoaderMessage): void {
      if (destroyed) return;
      const trackId = track.id;
      const bufferedSegments = untrack(() => textTracksActor.snapshot.get().context.segments[trackId] ?? []);
      const segmentsToLoad = getSegmentsToLoad(track.segments, bufferedSegments, currentTime);

      runner.abortAll();
      for (const segment of segmentsToLoad) {
        runner.schedule(
          new Task(async (signal) => {
            if (signal.aborted) return;
            try {
              const cues = await resolveSegment(segment.url);
              if (signal.aborted) return;
              textTracksActor.send({
                type: 'add-cues',
                meta: { trackId, id: segment.id, startTime: segment.startTime, duration: segment.duration },
                cues,
              });
            } catch (error) {
              // Graceful degradation: log and continue to the next segment.
              console.error('Failed to load text-track segment:', error);
            }
          })
        );
      }
    },

    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      runner.destroy();
    },
  };
}
