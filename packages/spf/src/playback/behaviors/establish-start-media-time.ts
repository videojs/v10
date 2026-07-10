/**
 * Establish each track's `startMediaTime` (its media-timeline origin) once per
 * source, so a non-zero-PTS source relocates onto a 0-based presentation timeline.
 * The VOD sibling of `anchor-presentation-timeline`: both are per-source
 * establishment units that write a coordinate base value onto every track (the
 * anchor writes `startDate`/`startTime` from wall clock; this writes
 * `startMediaTime` from the container's decode-time origin).
 *
 * This is the **DOM-free reactor half**: it owns the transient `mediaContainerData`
 * slot lifecycle (`inactive` clears it per source), runs the injected
 * {@link DeriveStartMediaTime} seam over it in `monitoring`, and stamps the settled
 * `startMediaTime` onto the model — the coordinate *consume* — until `established`.
 * The byte-level discover/stamp steps that fill the slot are a separate,
 * DOM-scoped config `messagePipelines` array (`behaviors/dom/relocation-steps`);
 * the two coordinate only through the shared `state.mediaContainerData` slot, never
 * by import. See `internal/design/spf/presentation-timeline-model.md`.
 */
import type { Behavior } from '../../core/composition/create-composition';
import { createMachineReactor, type Reactor } from '../../core/reactors/create-machine-reactor';
import { type ReadonlySignal, type Signal, update } from '../../core/signals/primitives';
import {
  isResolvedPresentation,
  type MaybeResolvedPresentation,
  type MediaContainerData,
  type Presentation,
} from '../../media/types';
import { findTrackById } from '../../media/utils/tracks';

// ============================================================================
// STATE / CONFIG
// ============================================================================

export interface EstablishStartMediaTimeState {
  presentation?: MaybeResolvedPresentation;
  /**
   * Transient origin-establishment data, keyed by **track type** (`'video'` /
   * `'audio'`) — per spec one init+media pair per type suffices, and ABR rungs of
   * a type share the origin. Filled by the discover steps across appends, reset
   * per source. Never the model — the churn stays here; only the settled
   * `startMediaTime` reaches `Track`.
   */
  mediaContainerData?: Record<string, MediaContainerData>;
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

export interface DeriveStartMediaTimeContext {
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
}

/**
 * Reduce the discovered container data (keyed by track type) into each type's
 * `startMediaTime`. `undefined` means "not ready yet". Pure and injected — the
 * single point of tier variation: Tier 1 is per-type own; a Tier-2 variant returns
 * the shared `min` across the selected A/V origins for every type.
 */
export type DeriveStartMediaTime = (
  containerData: Record<string, MediaContainerData>,
  ctx: DeriveStartMediaTimeContext
) => Record<string, number | undefined>;

/**
 * Tier 1 default — each type relocates by its own origin:
 * `startMediaTime = baseMediaDecodeTime/timescale − segmentStartTime` (the
 * `segmentStartTime` term makes it the stream origin even when the first loaded
 * segment isn't the 0th).
 */
export const derivePerTypeStartMediaTime: DeriveStartMediaTime = (containerData) => {
  const out: Record<string, number | undefined> = {};
  for (const [type, { timescale, baseMediaDecodeTime, segmentStartTime }] of Object.entries(containerData)) {
    out[type] =
      timescale != null && baseMediaDecodeTime != null && segmentStartTime != null
        ? baseMediaDecodeTime / timescale - segmentStartTime
        : undefined;
  }
  return out;
};

export interface EstablishStartMediaTimeConfig {
  /** The reduce seam (tier knob). Defaults to {@link derivePerTypeStartMediaTime}. */
  deriveStartMediaTime?: DeriveStartMediaTime;
}

// ============================================================================
// REACTOR (owns the transient slot; derives + consumes onto the model)
// ============================================================================

/** Stamp the derived per-track `startMediaTime` onto the model (idempotent — same reference when nothing moved). */
function stampTracks(presentation: Presentation, startMediaTimes: Record<string, number | undefined>): Presentation {
  let changed = false;
  const selectionSets = presentation.selectionSets.map((selectionSet) => ({
    ...selectionSet,
    switchingSets: selectionSet.switchingSets.map((switchingSet) => ({
      ...switchingSet,
      tracks: switchingSet.tracks.map((track) => {
        const startMediaTime = startMediaTimes[track.type];
        if (startMediaTime === undefined || track.startMediaTime === startMediaTime) return track;
        changed = true;
        return { ...track, startMediaTime };
      }),
    })),
  }));
  return changed ? ({ ...presentation, selectionSets } as Presentation) : presentation;
}

type EstablishFsmState = 'inactive' | 'monitoring' | 'established';

interface EstablishStartMediaTimeDeps {
  state: {
    presentation: Signal<EstablishStartMediaTimeState['presentation']>;
    mediaContainerData: Signal<EstablishStartMediaTimeState['mediaContainerData']>;
    // Optional so the one behavior composes across video-only / audio-only / both,
    // like other cross-track-type behaviors (present at runtime iff a sibling owns it).
    selectedVideoTrackId?: ReadonlySignal<EstablishStartMediaTimeState['selectedVideoTrackId']>;
    selectedAudioTrackId?: ReadonlySignal<EstablishStartMediaTimeState['selectedAudioTrackId']>;
  };
  config?: EstablishStartMediaTimeConfig;
}

function establishStartMediaTimeSetup({
  state,
  config = {},
}: EstablishStartMediaTimeDeps): Reactor<EstablishFsmState | 'destroying' | 'destroyed'> {
  const derive = config.deriveStartMediaTime ?? derivePerTypeStartMediaTime;

  const selectionContext = (): DeriveStartMediaTimeContext => ({
    selectedVideoTrackId: state.selectedVideoTrackId?.get(),
    selectedAudioTrackId: state.selectedAudioTrackId?.get(),
  });

  /** Established once the selected A/V tracks (whichever exist) carry `startMediaTime`. */
  const established = (): boolean => {
    const presentation = state.presentation.get();
    if (!isResolvedPresentation(presentation)) return false;
    const ids = [state.selectedVideoTrackId?.get(), state.selectedAudioTrackId?.get()].filter(
      (id): id is string => id !== undefined
    );
    return ids.length > 0 && ids.every((id) => findTrackById(presentation, id)?.startMediaTime !== undefined);
  };

  return createMachineReactor<EstablishFsmState>({
    initial: 'inactive',
    monitor: () => {
      if (!isResolvedPresentation(state.presentation.get())) return 'inactive';
      return established() ? 'established' : 'monitoring';
    },
    states: {
      // Fresh per source: clear the transient slot so a new source re-discovers.
      inactive: { entry: () => state.mediaContainerData.set(undefined) },
      // Derive: reduce the accumulating container data into per-track startMediaTime
      // and stamp it onto the model. Re-runs as discover fills the slot; the update
      // reads presentation untracked, so no self-loop. Disabled on entry to
      // `established` (establish-once, sticky per source).
      monitoring: {
        effects: () => {
          const containerData = state.mediaContainerData.get();
          if (!containerData) return;
          const startMediaTimes = derive(containerData, selectionContext());
          update(state.presentation as Signal<MaybeResolvedPresentation>, (current) =>
            isResolvedPresentation(current) ? stampTracks(current, startMediaTimes) : current
          );
        },
      },
      established: {},
    },
  });
}

export const establishStartMediaTime: Behavior<
  {
    presentation: Signal<EstablishStartMediaTimeState['presentation']>;
    mediaContainerData: Signal<EstablishStartMediaTimeState['mediaContainerData']>;
  },
  Record<never, never>,
  EstablishStartMediaTimeConfig
> = {
  stateKeys: ['presentation', 'mediaContainerData'],
  contextKeys: [],
  setup: establishStartMediaTimeSetup,
};
