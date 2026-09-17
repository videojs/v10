import { describe, expect, it, vi } from 'vite-plus/test';

import { effect } from '../../../core/signals/effect';
import { signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';
import type { FetchOptions, FetchText, Resource } from '../../../network/fetch';
import { credentialsFetch } from '../credentials-fetch';

const playlist = { url: 'https://cdn.example.com/r.m3u8' };

function makeBase() {
  return vi.fn<(addressable: Resource, options?: FetchOptions) => Promise<string>>(async () => 'body');
}

/** A behavior's narrow state: `presentation` is always declared; the credentials slot only when materialized. */
function makeState(requestCredentials?: RequestCredentials) {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>({ url: 'https://cdn.example.com/master.m3u8' }),
    requestCredentials: signal<RequestCredentials | undefined>(requestCredentials),
  };
}

describe('credentialsFetch', () => {
  it('forwards the slot value as the request credentials mode', async () => {
    const base = makeBase();
    const fetch = credentialsFetch(base as FetchText, makeState('include'));

    await expect(fetch(playlist, { signal: new AbortController().signal })).resolves.toBe('body');
    expect(base).toHaveBeenCalledWith(playlist, expect.objectContaining({ credentials: 'include' }));
    expect(base.mock.calls[0]![1]!.signal).toBeInstanceOf(AbortSignal);
  });

  it('leaves the options untouched when the slot is unset', async () => {
    const base = makeBase();
    const fetch = credentialsFetch(base as FetchText, makeState());

    await fetch(playlist);
    expect(base).toHaveBeenCalledWith(playlist, undefined);
  });

  it('no-ops when the slot is not materialized', async () => {
    const base = makeBase();
    const { presentation } = makeState();
    const fetch = credentialsFetch(base as FetchText, { presentation });
    const options = { signal: new AbortController().signal };

    await fetch(playlist, options);
    expect(base).toHaveBeenCalledWith(playlist, options);
  });

  it('reads the slot per request so a later change applies to the next fetch', async () => {
    const base = makeBase();
    const state = makeState();
    const fetch = credentialsFetch(base as FetchText, state);

    await fetch(playlist);
    state.requestCredentials.set('include');
    await fetch(playlist);

    expect(base.mock.calls[0]![1]).toBeUndefined();
    expect(base.mock.calls[1]![1]).toEqual({ credentials: 'include' });
  });

  it('lets an explicit per-call credentials mode win over the slot', async () => {
    const base = makeBase();
    const fetch = credentialsFetch(base as FetchText, makeState('include'));

    await fetch(playlist, { credentials: 'omit' });
    expect(base).toHaveBeenCalledWith(playlist, { credentials: 'omit' });
  });

  it('does not subscribe the calling effect to the slot', async () => {
    const base = makeBase();
    const state = makeState();
    const fetch = credentialsFetch(base as FetchText, state);
    const runs = vi.fn();

    const stop = effect(() => {
      runs();
      void fetch(playlist);
    });

    state.requestCredentials.set('include');
    await Promise.resolve();

    expect(runs).toHaveBeenCalledTimes(1);
    stop();
  });
});
