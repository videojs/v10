import { listen } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';

/**
 * State shape for load-trigger tracking.
 */
export interface LoadTriggersState {
  /**
   * Sticky-true per source. Flips to `true` the first time an event occurs
   * that should switch loading behavior from preload-based to standard load
   * (currently DOM `play` / `seeking`). Reset to `false` on source change.
   *
   * Read by `resolvePresentation` and `loadVideoSegments` / `loadAudioSegments`
   * to mirror native `HTMLMediaElement` preload semantics — only meaningful
   * when `preload !== 'auto'`, which already loads fully regardless.
   */
  loadActivated?: boolean;
  /** Current presentation — URL is used to detect source changes. */
  presentation?: MaybeResolvedPresentation;
}

/**
 * Context shape for load-trigger tracking.
 */
export interface LoadTriggersContext {
  mediaElement?: HTMLMediaElement | undefined;
}

/**
 * FSM derived state. The state machine gates on source-identity preconditions
 * (element attached + presentation URL set); it does **not** read the slot it
 * writes (`state.loadActivated`). The state name `'load-active'` describes the
 * world-fact "we are managing this source's load lifecycle" — not "the
 * `loadActivated` slot is `true`."
 *
 * ```
 * 'preconditions-unmet' ──── element + URL ────→ 'load-active'
 *         ↑                                          │
 *         └── element / URL → undefined ─────────────┘
 *               (entry cleanup resets loadActivated → false)
 *
 * any state ──── destroy() ────→ 'destroying' ────→ 'destroyed'
 * ```
 *
 * Identity changes within either input (urlA → urlB, elementA → elementB
 * with no `undefined` intermediate) rely on the engine convention that
 * source swaps destroy the engine and recreate it; intermediate signal
 * states pass through `undefined` so the state machine exits the positive
 * state and fires the entry's cleanup. Direct in-place swap of either
 * signal would not flip the slot back to `false`.
 */
function deriveState(
  presentation: MaybeResolvedPresentation | undefined,
  mediaElement: HTMLMediaElement | undefined
): 'preconditions-unmet' | 'load-active' {
  if (!mediaElement || !presentation?.url) return 'preconditions-unmet';
  return 'load-active';
}

/**
 * Track preload-overriding events per source.
 *
 * Writes `state.loadActivated = true` the first time a `play` or `seeking`
 * event fires on the attached media element for the current source — or
 * immediately on entry if the element is already in such a state
 * (`!el.paused` or `el.seeking`), mirroring autoplay / native-controls /
 * direct-DOM-`play()` scenarios.
 *
 * Sticky-true within a source: subsequent play/pause/seek cycles do not
 * flip the slot back. Resets to `false` on source change or behavior
 * destroy via the entry's state-exit cleanup.
 *
 * Multi-writer with `hls/adapter.ts:play()` (which writes `true` directly
 * on programmatic play) is intentional — different domains. This behavior
 * is the DOM-side observer; the adapter records programmatic intent.
 *
 * @example
 * const reactor = trackLoadTriggers.setup({ state, context });
 * // later:
 * reactor.destroy();
 */
function trackLoadTriggersSetup({
  state,
  context,
}: {
  state: {
    loadActivated: Signal<LoadTriggersState['loadActivated']>;
    presentation: ReadonlySignal<LoadTriggersState['presentation']>;
  };
  context: { mediaElement: ReadonlySignal<LoadTriggersContext['mediaElement']> };
}): Reactor<'preconditions-unmet' | 'load-active' | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() => deriveState(state.presentation.get(), context.mediaElement.get()));

  return createMachineReactor<'preconditions-unmet' | 'load-active'>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'load-active': {
        entry: () => {
          const el = context.mediaElement.get()!;

          // Pre-existing `true` write (e.g. adapter's `play()` ran before
          // setup completed): treat as intent already recognized; skip the
          // listener attach. The exit cleanup still resets on source change.
          if (state.loadActivated.get()) {
            return () => state.loadActivated.set(false);
          }

          // Element already in a load-eligible state at entry (autoplay,
          // mid-seek attach, etc.). Sticky write and skip listeners.
          if (!el.paused || el.seeking) {
            state.loadActivated.set(true);
            return () => state.loadActivated.set(false);
          }

          // Wait for the first qualifying DOM event. Either `play` or
          // `seeking` flips the slot; both writes are idempotent so we
          // don't bother detaching after the first fire.
          const ac = new AbortController();
          const onTrigger = () => state.loadActivated.set(true);
          listen(el, 'play', onTrigger, { signal: ac.signal });
          listen(el, 'seeking', onTrigger, { signal: ac.signal });

          return () => {
            ac.abort();
            state.loadActivated.set(false);
          };
        },
      },
    },
  });
}

export const trackLoadTriggers = defineBehavior({
  stateKeys: ['loadActivated', 'presentation'],
  contextKeys: ['mediaElement'],
  setup: trackLoadTriggersSetup,
});
