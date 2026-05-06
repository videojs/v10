import { describe, expect, it } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../../media/types';
import { exposeEngineInputs, type SimpleHlsEngineInputs } from '../expose-engine-inputs';

function makeDeps() {
  const state = {
    presentation: signal<MaybeResolvedPresentation | undefined>(undefined),
    preload: signal<'auto' | 'metadata' | 'none' | undefined>(undefined),
    playbackInitiated: signal<boolean | undefined>(undefined),
    abrDisabled: signal<boolean | undefined>(undefined),
  };
  const context = {
    mediaElement: signal<HTMLMediaElement | undefined>(undefined),
  };
  return { state, context };
}

describe('exposeEngineInputs', () => {
  it('passes the writable signal refs to the config callback', () => {
    const { state, context } = makeDeps();
    let captured: SimpleHlsEngineInputs | undefined;

    exposeEngineInputs.setup({
      state,
      context,
      config: {
        exposeInputs: (inputs) => {
          captured = inputs;
        },
      },
    });

    expect(captured).toBeDefined();
    expect(captured?.state.presentation).toBe(state.presentation);
    expect(captured?.state.preload).toBe(state.preload);
    expect(captured?.state.playbackInitiated).toBe(state.playbackInitiated);
    expect(captured?.state.abrDisabled).toBe(state.abrDisabled);
    expect(captured?.context.mediaElement).toBe(context.mediaElement);
  });

  it('captured refs write straight into composition state', () => {
    const { state, context } = makeDeps();
    let captured: SimpleHlsEngineInputs | undefined;

    exposeEngineInputs.setup({
      state,
      context,
      config: {
        exposeInputs: (inputs) => {
          captured = inputs;
        },
      },
    });

    captured?.state.presentation.set({ url: 'https://example.com/stream.m3u8' });
    captured?.state.preload.set('auto');
    captured?.state.playbackInitiated.set(true);

    expect(state.presentation.get()?.url).toBe('https://example.com/stream.m3u8');
    expect(state.preload.get()).toBe('auto');
    expect(state.playbackInitiated.get()).toBe(true);
  });

  it('does not require an exposeInputs callback', () => {
    const { state, context } = makeDeps();
    expect(() => {
      exposeEngineInputs.setup({ state, context, config: {} });
    }).not.toThrow();
  });

  it('declares the input keys in stateKeys and contextKeys', () => {
    expect(exposeEngineInputs.stateKeys).toEqual(['presentation', 'preload', 'playbackInitiated', 'abrDisabled']);
    expect(exposeEngineInputs.contextKeys).toEqual(['mediaElement']);
  });
});
