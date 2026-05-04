import { type ContextSignals, defineBehavior, type StateSignals } from '../../../core/composition/create-composition';
import type { Signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';
import type { SimpleHlsEngineContext, SimpleHlsEngineState } from './engine';

type InputState = Pick<SimpleHlsEngineState, 'presentation' | 'preload' | 'playbackInitiated' | 'abrDisabled'>;
type InputContext = Pick<SimpleHlsEngineContext, 'mediaElement'>;

/**
 * Writable signal refs to the engine's input slots, handed to a consumer
 * (adapter or harness) at composition setup time so it can drive the engine
 * imperatively without touching `composition.state` / `composition.context`
 * directly.
 *
 * Mirrors the composition's `state` / `context` separation rather than
 * flattening — a context key and a state key may share a name without
 * colliding.
 */
export interface SimpleHlsEngineInputs {
  state: {
    presentation: Signal<MaybeResolvedPresentation | undefined>;
    preload: Signal<'auto' | 'metadata' | 'none' | undefined>;
    playbackInitiated: Signal<boolean | undefined>;
    abrDisabled: Signal<boolean | undefined>;
  };
  context: {
    mediaElement: Signal<HTMLMediaElement | undefined>;
  };
}

export interface ExposeEngineInputsConfig {
  /**
   * Called once during composition setup with writable refs to the
   * engine's input signals. The consumer captures these and writes through
   * them — the canonical write path for time-varying external inputs.
   */
  exposeInputs?: (inputs: SimpleHlsEngineInputs) => void;
}

/**
 * Hands writable refs to the engine's input signals to a consumer-supplied
 * callback. The behavior is the type-level "owner" of these signals; the
 * consumer (adapter / harness) writes through the captured refs at runtime.
 */
export const exposeEngineInputs = defineBehavior({
  stateKeys: ['presentation', 'preload', 'playbackInitiated', 'abrDisabled'],
  contextKeys: ['mediaElement'],
  setup: ({
    state,
    context,
    config,
  }: {
    state: StateSignals<InputState>;
    context: ContextSignals<InputContext>;
    config: ExposeEngineInputsConfig;
  }) => {
    config.exposeInputs?.({
      state: {
        presentation: state.presentation,
        preload: state.preload,
        playbackInitiated: state.playbackInitiated,
        abrDisabled: state.abrDisabled,
      },
      context: {
        mediaElement: context.mediaElement,
      },
    });
  },
});
