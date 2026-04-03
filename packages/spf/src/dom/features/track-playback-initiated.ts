import { listen } from '@videojs/utils/dom';
import type { Reactor } from '../../core/create-reactor';
import { createReactor } from '../../core/create-reactor';
import { computed, type Signal, signal, untrack, update } from '../../core/signals/primitives';

/**
 * State shape for playback initiation tracking.
 */
export interface PlaybackInitiatedState {
  /** True once play has been requested for the current presentation URL. */
  playbackInitiated?: boolean;
  /** Current presentation — URL is used to detect source changes. */
  presentation?: { url?: string };
}

/**
 * Owners shape for playback initiation tracking.
 */
export interface PlaybackInitiatedOwners {
  mediaElement?: HTMLMediaElement | undefined;
}

/**
 * FSM states for playback initiation tracking.
 *
 * ```
 * 'preconditions-unmet' ──── element + URL ────→ 'monitoring'
 *         ↑                        ↑                  │
 *         │   preconditions lost   │             play event
 *         │                        │                  ↓
 *         └────────────── 'playback-initiated' ←──────┘
 *                (exit cleanup resets state.playbackInitiated → false)
 *                URL change / element swap → 'monitoring' via deriveStatus
 *
 * any state ──── destroy() ────→ 'destroying' ────→ 'destroyed'
 * ```
 */
type PlaybackInitiatedStatus = 'preconditions-unmet' | 'monitoring' | 'playback-initiated';

function deriveStatus(
  element: HTMLMediaElement | undefined,
  url: string | undefined,
  playbackInitiated: boolean | undefined,
  capturedUrl: string | undefined,
  capturedElement: HTMLMediaElement | undefined
): PlaybackInitiatedStatus {
  if (!element || !url) return 'preconditions-unmet';
  if (playbackInitiated && url === capturedUrl && element === capturedElement) {
    return 'playback-initiated';
  }
  return 'monitoring';
}

/**
 * Track whether playback has been initiated for the current presentation URL.
 *
 * A three-state Reactor FSM driven by `state.playbackInitiated` and the
 * `deriveStatus` pattern:
 * - `'preconditions-unmet'` — no element or URL yet; no effects.
 * - `'monitoring'` — listens for a `play` event; re-attaches when element changes.
 * - `'playback-initiated'` — writes `true` to state; exit cleanup resets to `false`
 *   on any outbound transition (URL change, element swap, or lost preconditions).
 *
 * @example
 * const reactor = trackPlaybackInitiated({ state, owners });
 * // later:
 * reactor.destroy();
 */
export function trackPlaybackInitiated<S extends PlaybackInitiatedState, O extends PlaybackInitiatedOwners>({
  state,
  owners,
}: {
  state: Signal<S>;
  owners: Signal<O>;
}): Reactor<PlaybackInitiatedStatus | 'destroying' | 'destroyed', object> {
  const presentationUrlSignal = computed(() => state.get().presentation?.url);
  const mediaElementSignal = computed(() => owners.get().mediaElement);
  const playbackInitiatedSignal = computed(() => state.get().playbackInitiated);

  // Captured at the moment playback is initiated — used by deriveStatus to detect
  // URL changes or element swaps that should reset to 'monitoring'.
  const capturedUrlSignal = signal<string | undefined>(undefined);
  const capturedElementSignal = signal<HTMLMediaElement | undefined>(undefined);

  const derivedStatusSignal = computed(() =>
    deriveStatus(
      mediaElementSignal.get(),
      presentationUrlSignal.get(),
      playbackInitiatedSignal.get(),
      capturedUrlSignal.get(),
      capturedElementSignal.get()
    )
  );

  function initiate() {
    capturedUrlSignal.set(untrack(() => presentationUrlSignal.get()));
    capturedElementSignal.set(untrack(() => mediaElementSignal.get()));
    update(state, { playbackInitiated: true } as Partial<S>);
  }

  return createReactor<PlaybackInitiatedStatus, object>({
    initial: 'preconditions-unmet',
    context: {},
    always: [
      ({ status, transition }) => {
        const target = derivedStatusSignal.get();
        if (target !== status) transition(target);
      },
    ],
    states: {
      'preconditions-unmet': [],

      monitoring: [
        // Reactive: attach play listener; re-runs when element changes.
        () => {
          const el = mediaElementSignal.get(); // tracked
          if (!el) return;
          return listen(el, 'play', initiate);
        },
      ],

      'playback-initiated': [
        // Enter-once: write true to state.
        // Exit cleanup: reset to false on any outbound transition — URL change,
        // element swap, or lost preconditions all go through here.
        () => {
          update(state, { playbackInitiated: true } as Partial<S>);
          return () => {
            update(state, { playbackInitiated: false } as Partial<S>);
          };
        },
      ],
    },
  });
}
