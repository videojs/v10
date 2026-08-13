/**
 * **Default audio/video track selection on src load / unselect on src unload.**
 * When a presentation is resolved, sets `selectedVideoTrackId` /
 * `selectedAudioTrackId` from a per-type default rule chain if no selection
 * already exists. When the presentation is unset/reset (transitions back to unresolved),
 * clears the selection so a stale id from the previous source doesn't persist.
 *
 * Lifecycle-driven: each transition fires its work once. Does not police the
 * selection between transitions; external writes (user picks, ABR, programmatic
 * filter-driven re-picks) are left alone.
 *
 * Selection runs the same rule model `switchVideoTrack` does — a hard
 * `constraints` pre-pass, then an ordered `rules` chain, with the pick as the
 * head (see `internal/design/spf/track-switching-model.md`). What differs is
 * reactivity, not the rules: this evaluates the chain once on resolve and pins
 * the result, where `switchVideoTrack` re-evaluates inside an effect so its rules
 * subscribe to bandwidth and user selection. A rule written for one therefore
 * composes into the other unchanged.
 *
 * Both are config-driven, each per-type export wiring a sensible default: audio's
 * three-tier language policy, and for video the *empty* chain — with nothing
 * narrowing or reordering, the head is the first candidate. The behavior's
 * `config` is forwarded to the rules, so options like `preferredAudioLanguage`
 * reach them without an intermediate layer.
 *
 * Note a rule can only pick among real candidates, where the picker it replaced
 * could return any id at all. An id absent from the manifest was never
 * selectable, so that narrowing is the point rather than a limitation.
 *
 * Compose `selectVideoTrack` for the simple "pick a default video track"
 * behavior, or `switchVideoTrack` (`./track-switching.ts`) for the
 * ABR-driven variant. Compose `selectAudioTrack` for the simple default
 * pick, or `switchAudioTrack` (`./track-switching.ts`) for the
 * filter-reactive + mid-stream-flush slot-owner variant — when audio-abr
 * lands, `switchAudioTrack` extends into `switchAudioQuality`. Compose
 * only one per type — they're alternatives, not stackable (each writes
 * the same `selected*TrackId` slot). The simple variants tree-shake out
 * the heavier machinery (bandwidth estimator, quality selection, flush
 * orchestration).
 *
 * Text selection has no simple variant here — it's owned by `switchTextTrack`
 * (`./track-switching.ts`), which resolves standing `userTextTrackSelection`
 * intent against the constrained, CDN-scoped renditions.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import {
  type AudioSelectionConfig,
  pickAudioTrackFromTracks,
  pickTrackUnderPixelArea,
  type TrackSelectionState,
  type VideoSelectionConfig,
} from '../../media/primitives/select-tracks';
import { isResolvedPresentation, type TrackType } from '../../media/types';
import { getTracksByType } from '../../media/utils/tracks';
import { applyConstraints, applyRules, type SelectionRule } from '../primitives/selection-rules';
import { AUDIO_TYPE_CONFIG, VIDEO_TYPE_CONFIG } from '../primitives/track-types';

// ============================================================================
// Specialization helper
//
// `setupTrackSelection` has the same shape as a Behavior `setup` function:
// `({ state, config }) => Reactor`. Each `selectXTrack` export below calls
// it from inside its own `defineBehavior` setup, supplying its per-type
// `selectedKey`, track type, default rule chain, and forwarded config. The lifecycle
// — pick on entering 'presentation-resolved' if not already selected; clear
// on entering 'presentation-unresolved' — is shared.
// ============================================================================

type SelectedTrackKey = 'selectedVideoTrackId' | 'selectedAudioTrackId';

type SelectStateMap<K extends SelectedTrackKey> = {
  presentation: ReadonlySignal<TrackSelectionState['presentation']>;
} & { [P in K]: Signal<TrackSelectionState[P]> };

/** A selection rule over this behavior's candidate tracks. */
export type SelectTrackRule<Config> = SelectionRule<SelectableTrack, unknown, unknown, Config | undefined>;

/** What a rule here needs off a candidate: the id it may become the pick by. */
type SelectableTrack = { id: string };

interface TrackSelectionSetupConfig<K extends SelectedTrackKey, RuleConfig> {
  selectedKey: K;
  trackType: TrackType;
  constraints: readonly SelectTrackRule<RuleConfig>[];
  rules: readonly SelectTrackRule<RuleConfig>[];
  ruleConfig?: RuleConfig;
}

function setupTrackSelection<K extends SelectedTrackKey, RuleConfig>({
  state,
  config: { selectedKey, trackType, constraints, rules, ruleConfig },
}: {
  state: SelectStateMap<K>;
  config: TrackSelectionSetupConfig<K, RuleConfig>;
}) {
  const derivedStateSignal = computed(() =>
    isResolvedPresentation(state.presentation.get())
      ? ('presentation-resolved' as const)
      : ('presentation-unresolved' as const)
  );

  return createMachineReactor({
    initial: 'presentation-unresolved',
    monitor: () => derivedStateSignal.get(),
    states: {
      'presentation-unresolved': {},
      'presentation-resolved': {
        // Entry: pick a default on entering presentation-resolved if none
        // is set. External writes (user picks, ABR) that already populated
        // the slot are left alone.
        //
        // The returned cleanup runs on state exit — which fires on src
        // unload (presentation-resolved → presentation-unresolved) AND on
        // behavior destroy (presentation-resolved → destroying →
        // destroyed). Putting the clear here rather than as
        // presentation-unresolved.entry is more cohesive (operation +
        // cleanup co-located) and correctly covers destroy (destroy
        // doesn't pass through presentation-unresolved).
        entry: () => {
          if (!state[selectedKey].get()) {
            // `state.presentation.get()` is non-null inside this entry —
            // the reactor's `'presentation-resolved'` gate is exactly
            // `isResolvedPresentation(state.presentation.get())`, which
            // requires a truthy Presentation.
            const deps = { state, config: ruleConfig };
            const candidates = getTracksByType(state.presentation.get()!, trackType);
            // Constraints prune the unplayable, then the chain narrows and ranks;
            // the pick is the head. An empty `rules` chain therefore selects the
            // first candidate — the same answer `pickFirstTrackId` gave, now a
            // consequence of the model rather than a separate code path.
            const survivors = applyRules(rules, applyConstraints(constraints, candidates, deps), deps);
            const id = survivors[0]?.id;
            if (id) state[selectedKey].set(id);
          }
          return () => state[selectedKey].set(undefined);
        },
      },
    },
  });
}

// ============================================================================
// Default rules
//
// Each variant resolves its chain as `config?.rules ?? <default>`. The whole
// behavior config is forwarded as the rules' `config`, so a policy rule reads
// its own options (`preferredAudioLanguage`) directly off it.
//
// Video's default is the *empty* chain: with no rule narrowing or reordering the
// candidates, the head is the first track — exactly what `pickFirstTrackId` used
// to return, now falling out of the model instead of being its own code path.
// ============================================================================

/** Default video chain: none. The first candidate is the pick. */
const DEFAULT_VIDEO_RULES: readonly SelectTrackRule<SelectVideoTrackConfig>[] = [];

/**
 * Default audio chain: the three-tier policy (`preferredAudioLanguage` →
 * `DEFAULT=YES` → first) as a single narrowing rule. Returning `[]` when nothing
 * is picked lets `applyRules` fall through to the unnarrowed candidates, so the
 * head stays the first track — the same last tier the policy itself ends on.
 */
const preferAudioPolicy: SelectTrackRule<SelectAudioTrackConfig> = (tracks, { config }) => {
  const id = pickAudioTrackFromTracks(tracks as readonly { id: string }[], config);
  const pick = tracks.find((track) => track.id === id);
  return pick ? [pick] : [];
};

const DEFAULT_AUDIO_RULES: readonly SelectTrackRule<SelectAudioTrackConfig>[] = [preferAudioPolicy];

/**
 * Narrow to the largest rendition on offer, by pixel area. The background-video
 * default — that variant pins one rendition for the session, and absent a cap the
 * largest is the pick.
 *
 * Exported because it is a *rule*, not a variant's private policy: the same one
 * composes into `switchVideoTrack`'s chain when a ranker is wanted there.
 */
export const preferHighestResolution: SelectTrackRule<unknown> = (tracks) => {
  const pick = pickTrackUnderPixelArea(tracks as readonly { id: string }[]);
  return pick ? [pick] : [];
};

// ============================================================================
// Specialized exports — one per track type
// ============================================================================

/**
 * Config for `selectVideoTrack`. Pass `rules` to replace the selection chain, or
 * `constraints` to prune candidates before it runs; otherwise the chain is empty
 * and the first candidate is the pick.
 */
export interface SelectVideoTrackConfig extends VideoSelectionConfig {
  constraints?: readonly SelectTrackRule<SelectVideoTrackConfig>[];
  rules?: readonly SelectTrackRule<SelectVideoTrackConfig>[];
}

/**
 * Select a video track when a presentation loads. Clears the selection on
 * src unload.
 *
 * This is the simple, non-ABR counterpart to `switchVideoTrack` — compose
 * one or the other, not both (both write `selectedVideoTrackId`). Composing
 * `selectVideoTrack` alone tree-shakes out the ABR code path
 * (bandwidth-estimator, quality-selection); use it for sources without
 * meaningful quality variants, test setups, or players that intentionally
 * pin a quality.
 *
 * @example
 * const reactor = selectVideoTrack.setup({ state });
 */
export const selectVideoTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  contextKeys: [],
  setup: ({ state, config }: { state: SelectStateMap<'selectedVideoTrackId'>; config?: SelectVideoTrackConfig }) =>
    setupTrackSelection({
      state,
      config: {
        selectedKey: VIDEO_TYPE_CONFIG.selectedKey,
        trackType: 'video',
        constraints: config?.constraints ?? [],
        rules: config?.rules ?? DEFAULT_VIDEO_RULES,
        ruleConfig: config,
      },
    }),
});

/**
 * Config for `selectAudioTrack`. Pass `rules` to replace the selection chain, or
 * `constraints` to prune candidates before it runs; otherwise the default
 * three-tier policy applies (`preferredAudioLanguage` → `DEFAULT=YES` → first).
 */
export interface SelectAudioTrackConfig extends AudioSelectionConfig {
  constraints?: readonly SelectTrackRule<SelectAudioTrackConfig>[];
  rules?: readonly SelectTrackRule<SelectAudioTrackConfig>[];
}

/**
 * Select an audio track when a presentation loads. Clears the selection
 * on src unload.
 *
 * This is the simple, lifecycle-only counterpart to `switchAudioTrack`
 * (in `./track-switching.ts`) — compose one or the other, not both
 * (both write `selectedAudioTrackId`). `switchAudioTrack` adds
 * filter-reactivity (`userAudioTrackSelection`) and mid-stream-flush
 * orchestration; `selectAudioTrack` covers the default-on-load case
 * without those. Use this variant for test setups, audio-only flows
 * that don't expose language switching, or composition variants that
 * intentionally pin a track.
 *
 * @example
 * const reactor = selectAudioTrack.setup({ state });
 *
 * @example
 * // Language preference, honored by the default audio policy rule
 * const reactor = selectAudioTrack.setup({
 *   state,
 *   config: { preferredAudioLanguage: 'en' },
 * });
 */
export const selectAudioTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedAudioTrackId'],
  contextKeys: [],
  setup: ({ state, config }: { state: SelectStateMap<'selectedAudioTrackId'>; config?: SelectAudioTrackConfig }) =>
    setupTrackSelection({
      state,
      config: {
        selectedKey: AUDIO_TYPE_CONFIG.selectedKey,
        trackType: 'audio',
        constraints: config?.constraints ?? [],
        rules: config?.rules ?? DEFAULT_AUDIO_RULES,
        ruleConfig: config,
      },
    }),
});
