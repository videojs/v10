/**
 * Live media-playlist reload *scheduling*, per track type.
 *
 * Category [3] "refetch policy" from
 * [live-presentation-modeling.md](../../../internal/design/spf/live-presentation-modeling.md):
 * decides *when* a track's media playlist should be re-fetched, without doing
 * any fetching itself. Once the presentation is resolved and a track of this
 * type is selected, it bumps a per-type reload-epoch slot on a target-duration
 * cadence (half that when the last reload was unchanged, per RFC 8216bis
 * §6.3.4); the sibling `resolveTrack` loader (category [1]) watches that slot
 * and performs the actual fetch+parse+merge.
 *
 * The split keeps "when to refetch" and "what segments are in the playlist"
 * — categories that change at different rates — in separate behaviors.
 *
 * Inert for VoD: it stays `idle` once the resolved track reports
 * `#EXT-X-ENDLIST` (a complete playlist never reloads), so no scheduler-aware
 * engine config is needed. It enters on track *selection* (not resolution) so
 * its bumps also drive retries of a failed/slow first resolve until the loader
 * succeeds.
 *
 * Specialized per type via the shared `setupTrackReloadSchedule` (mirrors
 * `resolve-track`): `scheduleVideoTrackReload` / `scheduleAudioTrackReload` /
 * `scheduleTextTrackReload`, each gating on its own `selected*TrackId` + track
 * type, so demuxed audio and video reload independently.
 *
 * Limitations (intentional, for now): selection is read once at loop start
 * (mid-stream track switching isn't encoded in the reactor's two states).
 */
import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
import {
  getMediaPlaylistMetadata,
  isResolvedPresentation,
  isResolvedTrack,
  type MaybeResolvedPresentation,
  type ResolvedTrack,
  type TrackType,
} from '../../media/types';
import { findTrack } from '../../media/utils/tracks';
import { AUDIO_TYPE_CONFIG, TEXT_TYPE_CONFIG, VIDEO_TYPE_CONFIG } from '../primitives/track-types';

export interface ScheduleTrackReloadState {
  presentation?: MaybeResolvedPresentation;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
  videoReloadEpoch?: number;
  audioReloadEpoch?: number;
  textReloadEpoch?: number;
}

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId' | 'selectedTextTrackId';
type ReloadEpochKey = 'videoReloadEpoch' | 'audioReloadEpoch' | 'textReloadEpoch';
type ScheduleStateName = 'idle' | 'scheduling';

type ScheduleTrackReloadStateMap<K extends SelectedTrackKey, E extends ReloadEpochKey> = {
  presentation: ReadonlySignal<ScheduleTrackReloadState['presentation']>;
} & { [P in K]: ReadonlySignal<ScheduleTrackReloadState[P]> } & { [P in E]: Signal<ScheduleTrackReloadState[P]> };

interface TrackReloadScheduleConfig<K extends SelectedTrackKey, E extends ReloadEpochKey> {
  type: TrackType;
  selectedKey: K;
  reloadEpochKey: E;
}

/** Fallback reload cadence when the playlist carries no usable target duration. */
const FALLBACK_TARGET_DURATION = 6;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

/** Identity of a reload snapshot — window position + length. Changes when the window slid or grew. */
function snapshotSignature(track: ResolvedTrack): string {
  return `${getMediaPlaylistMetadata(track)?.mediaSequence ?? 0}:${track.segments.length}`;
}

function setupTrackReloadSchedule<K extends SelectedTrackKey, E extends ReloadEpochKey>({
  state,
  config: { type, selectedKey, reloadEpochKey },
}: {
  state: ScheduleTrackReloadStateMap<K, E>;
  config: TrackReloadScheduleConfig<K, E>;
}) {
  const derivedStateSignal = computed<ScheduleStateName>(() => {
    const presentation = state.presentation.get();
    const trackId = state[selectedKey].get();
    if (!isResolvedPresentation(presentation) || !trackId) return 'idle';
    const track = findTrack(presentation, type, trackId);
    if (!track) return 'idle';
    // A complete playlist (VoD, or live that has ended) never reloads. An
    // unresolved track keeps us scheduling so the loader's first resolve is
    // retried via the epoch bumps.
    if (isResolvedTrack(track) && getMediaPlaylistMetadata(track)?.endList) return 'idle';
    return 'scheduling';
  });

  return createMachineReactor<ScheduleStateName>({
    initial: 'idle',
    monitor: () => derivedStateSignal.get(),
    states: {
      idle: {},
      scheduling: {
        entry: () => {
          const ac = new AbortController();
          const trackId = state[selectedKey].get()!;

          void (async () => {
            // Signature of the snapshot seen at the previous iteration, to
            // detect whether the last reload changed the window.
            let lastSignature: string | null = null;

            while (!ac.signal.aborted) {
              const presentation = peek(state.presentation);
              const track = isResolvedPresentation(presentation) ? findTrack(presentation, type, trackId) : undefined;
              const meta = track && isResolvedTrack(track) ? getMediaPlaylistMetadata(track) : undefined;
              if (meta?.endList) break;

              const signature = track && isResolvedTrack(track) ? snapshotSignature(track) : null;
              // First pass (no baseline) or a moved window counts as changed →
              // full cadence; an unchanged window polls at half cadence.
              const changed = signature === null || signature !== lastSignature;
              lastSignature = signature;

              const target = meta?.targetDuration || FALLBACK_TARGET_DURATION;
              try {
                await sleep((changed ? target : target / 2) * 1000, ac.signal);
              } catch {
                return; // aborted during the wait
              }

              update(state[reloadEpochKey], (epoch) => (epoch ?? 0) + 1);
            }
          })();

          // State-exit (source change / destroy / endList) aborts the loop.
          return () => ac.abort();
        },
      },
    },
  });
}

const VIDEO_RELOAD_SCHEDULE_CONFIG = {
  type: VIDEO_TYPE_CONFIG.type,
  selectedKey: VIDEO_TYPE_CONFIG.selectedKey,
  reloadEpochKey: 'videoReloadEpoch',
} as const;
const AUDIO_RELOAD_SCHEDULE_CONFIG = {
  type: AUDIO_TYPE_CONFIG.type,
  selectedKey: AUDIO_TYPE_CONFIG.selectedKey,
  reloadEpochKey: 'audioReloadEpoch',
} as const;
const TEXT_RELOAD_SCHEDULE_CONFIG = {
  type: TEXT_TYPE_CONFIG.type,
  selectedKey: TEXT_TYPE_CONFIG.selectedKey,
  reloadEpochKey: 'textReloadEpoch',
} as const;

/** Schedule live reloads of the selected video track's media playlist. */
export const scheduleVideoTrackReload = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId', 'videoReloadEpoch'],
  contextKeys: [],
  setup: ({ state }: { state: ScheduleTrackReloadStateMap<'selectedVideoTrackId', 'videoReloadEpoch'> }) =>
    setupTrackReloadSchedule({ state, config: VIDEO_RELOAD_SCHEDULE_CONFIG }),
});

/** Schedule live reloads of the selected audio track's media playlist (demuxed audio). */
export const scheduleAudioTrackReload = defineBehavior({
  stateKeys: ['presentation', 'selectedAudioTrackId', 'audioReloadEpoch'],
  contextKeys: [],
  setup: ({ state }: { state: ScheduleTrackReloadStateMap<'selectedAudioTrackId', 'audioReloadEpoch'> }) =>
    setupTrackReloadSchedule({ state, config: AUDIO_RELOAD_SCHEDULE_CONFIG }),
});

/** Schedule live reloads of the selected text track's media playlist (live captions). */
export const scheduleTextTrackReload = defineBehavior({
  stateKeys: ['presentation', 'selectedTextTrackId', 'textReloadEpoch'],
  contextKeys: [],
  setup: ({ state }: { state: ScheduleTrackReloadStateMap<'selectedTextTrackId', 'textReloadEpoch'> }) =>
    setupTrackReloadSchedule({ state, config: TEXT_RELOAD_SCHEDULE_CONFIG }),
});
