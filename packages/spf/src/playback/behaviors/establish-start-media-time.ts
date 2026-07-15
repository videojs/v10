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
 * DOM-scoped config `messagePipelines` array (`behaviors/dom/relocation-pipelines`);
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
 * `startMediaTime`. `undefined` means "not ready yet". Pure and injected — the single
 * coordination seam. The default {@link deriveSharedMinStartMediaTime} relocates every
 * track by one shared `min` origin (handles aligned + skewed A/V + single-type);
 * {@link derivePerTypeStartMediaTime} is the barrier-free per-type alternative.
 */
export type DeriveStartMediaTime = (
  containerData: Record<string, MediaContainerData>,
  ctx: DeriveStartMediaTimeContext
) => Record<string, number | undefined>;

/**
 * A single type's own media-timeline origin:
 * `baseMediaDecodeTime/timescale − segmentStartTime` (the `segmentStartTime` term
 * makes it the stream origin even when the first loaded segment isn't the 0th).
 * `undefined` until timescale + baseMediaDecodeTime + segmentStartTime are all present.
 */
function ownOrigin(data: MediaContainerData | undefined): number | undefined {
  const { timescale, baseMediaDecodeTime, segmentStartTime } = data ?? {};
  return timescale != null && baseMediaDecodeTime != null && segmentStartTime != null
    ? baseMediaDecodeTime / timescale - segmentStartTime
    : undefined;
}

/**
 * Origins below this magnitude (seconds) are treated as `0` — the derive returns `0`, so
 * the presentation is left on its native (~0-based) timeline and no `timestampOffset` is
 * set (the loader stamp no-ops on a derived `0`). Ordinary VOD carries a small nonzero
 * encode origin (audio priming, first-frame CTS, edit lists); relocating by a sub-second
 * amount is pointless, and setting `timestampOffset` at all can ripple edge segments.
 * Relocation targets streams with an intentional large origin (instant clips, bipbop @10s).
 *
 * Absolute basis, not proportional: the DTS-below-zero / ripple risk scales with the
 * origin's absolute size, not with the presentation's duration. Also snaps negatives to
 * `0` — a negative origin would relocate *forward*, which is never the intent.
 */
export const NEAR_ZERO_ORIGIN_THRESHOLD = 1;

/** Snap a below-threshold (incl. negative) origin to `0` so it isn't relocated. */
function thresholdOrigin(origin: number): number {
  return origin < NEAR_ZERO_ORIGIN_THRESHOLD ? 0 : origin;
}

/**
 * The **default** — relocate the whole presentation by one shared origin: the `min`
 * across the *selected* A/V tracks' own origins, denormalized onto every type. This
 * single reduce subsumes the "per-type" and "shared" tiers:
 * - **aligned A/V** — `min` equals each origin (they're equal), so it matches per-type;
 * - **skewed A/V** (e.g. Apple's 44ms audio-lead) — `min` keeps every track's earliest
 *   DTS ≥ 0 (relocating by ≤ each own origin never drives one negative) *and* preserves
 *   the real skew (per-type would flatten it, desyncing A/V);
 * - **single type / muxed** — `min` of the one origin is that origin.
 *
 * Returns `undefined` for every type until all *selected* types have a complete origin
 * (the shared-`min` barrier). Which types must contribute is read from `ctx` (the
 * selected v/a ids); with no selection context it coordinates across whatever types
 * have data. A shared origin below {@link NEAR_ZERO_ORIGIN_THRESHOLD} is returned as `0`
 * (native — ordinary ~0-PTS VOD isn't relocated).
 */
export const deriveSharedMinStartMediaTime: DeriveStartMediaTime = (containerData, ctx) => {
  const contributingTypes: string[] = [];
  if (ctx.selectedVideoTrackId != null) contributingTypes.push('video');
  if (ctx.selectedAudioTrackId != null) contributingTypes.push('audio');
  const types = contributingTypes.length > 0 ? contributingTypes : Object.keys(containerData);

  const origins = types.map((type) => ownOrigin(containerData[type]));
  // Barrier: not ready until every contributing type has a complete origin.
  if (origins.length === 0 || origins.some((origin) => origin === undefined)) return {};

  const shared = thresholdOrigin(Math.min(...(origins as number[])));
  const out: Record<string, number | undefined> = {};
  for (const type of Object.keys(containerData)) out[type] = shared;
  return out;
};

/**
 * Coordination-axis *off* — each type relocates by its own origin, independently. Not
 * the default: it flattens real A/V skew (see {@link deriveSharedMinStartMediaTime}).
 * Kept as an opt-in for compositions that know their A/V is aligned and want to skip
 * the shared-`min` barrier (each type stamps as soon as its own origin is discovered).
 */
export const derivePerTypeStartMediaTime: DeriveStartMediaTime = (containerData) => {
  const out: Record<string, number | undefined> = {};
  for (const [type, data] of Object.entries(containerData)) {
    const origin = ownOrigin(data);
    out[type] = origin === undefined ? undefined : thresholdOrigin(origin);
  }
  return out;
};

export interface EstablishStartMediaTimeConfig {
  /** The reduce seam (coordination knob). Defaults to {@link deriveSharedMinStartMediaTime}. */
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
  const derive = config.deriveStartMediaTime ?? deriveSharedMinStartMediaTime;

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
          // `current` is always resolved here — the monitor gates `monitoring` on a
          // resolved presentation and transitions before effects re-run — so we cast
          // to `Presentation` rather than re-narrowing.
          update(state.presentation as Signal<MaybeResolvedPresentation>, (current) =>
            stampTracks(current as Presentation, startMediaTimes)
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
