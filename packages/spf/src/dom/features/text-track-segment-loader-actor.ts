import type { CallbackActor } from '../../core/actor';
import { getSegmentsToLoad } from '../../core/buffer/forward-buffer';
import { untrack } from '../../core/signals/primitives';
import { SerialRunner, Task } from '../../core/task';
import type { TextTrack } from '../../core/types';
import { parseVttSegment } from '../text/parse-vtt-segment';
import type { TextTracksActor } from './text-tracks-actor';

// =============================================================================
// Types
// =============================================================================

export type TextTrackSegmentLoaderMessage = {
  type: 'load';
  track: TextTrack;
  currentTime: number;
};

export type TextTrackSegmentLoaderActor = CallbackActor<TextTrackSegmentLoaderMessage>;

// =============================================================================
// Implementation
// =============================================================================

/**
 * Loads VTT segments for a text track and delegates cue management to a
 * TextTracksActor. Mirrors the SegmentLoaderActor/SourceBufferActor pattern
 * for the text track equivalent.
 *
 * Planning is done in the load handler: segments already recorded in
 * TextTracksActor's context are skipped. Each load preempts in-flight work
 * via abortAll() before scheduling fresh tasks.
 */
export function createTextTrackSegmentLoaderActor(textTracksActor: TextTracksActor): TextTrackSegmentLoaderActor {
  const runner = new SerialRunner();

  return {
    send({ track, currentTime }: TextTrackSegmentLoaderMessage): void {
      const trackId = track.id;
      const bufferedSegments = untrack(() => textTracksActor.snapshot.get().context.segments[trackId] ?? []);
      const segmentsToLoad = getSegmentsToLoad(track.segments, bufferedSegments, currentTime);

      runner.abortAll();
      for (const segment of segmentsToLoad) {
        runner.schedule(
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
        );
      }
    },

    destroy(): void {
      runner.destroy();
    },
  };
}
