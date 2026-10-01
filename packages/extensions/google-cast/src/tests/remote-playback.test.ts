import { describe, expect, it, vi } from 'vite-plus/test';

import { GoogleCastProvider } from '../google-cast-provider';
import { RemotePlayback, type RemotePlaybackHooks } from '../remote-playback';
import { InvalidStateError, NotFoundError } from '../utils';

interface SetupOptions {
  available?: boolean;
  disabled?: boolean;
}

function setup({ available = false, disabled = false }: SetupOptions = {}) {
  const hooks: Partial<RemotePlaybackHooks> = {};
  const providerDouble = {
    target: { disableRemotePlayback: disabled },
    bindHooks(next: Partial<RemotePlaybackHooks>) {
      Object.assign(hooks, next);
    },
    hasDevicesAvailable: vi.fn(() => available),
    requestCastSession: vi.fn(async () => {}),
  };
  const provider: GoogleCastProvider = Object.assign(Object.create(GoogleCastProvider.prototype), providerDouble);
  const remote = new RemotePlayback(provider);

  return { hooks, provider, remote };
}

describe('RemotePlayback', () => {
  it('publishes state transitions through the matching W3C events', () => {
    const { hooks, remote } = setup();
    const states: string[] = [];

    remote.addEventListener('connecting', () => states.push(remote.state));
    remote.addEventListener('connect', () => states.push(remote.state));
    remote.addEventListener('disconnect', () => states.push(remote.state));

    hooks.setState?.('connecting');
    hooks.setState?.('connecting');
    hooks.setState?.('connected');
    hooks.setState?.('disconnected');

    expect(states).toEqual(['connecting', 'connected', 'disconnected']);
    expect(remote.state).toBe('disconnected');
  });

  it('reports the current device availability to a new watcher', async () => {
    const { provider, remote } = setup({ available: true });
    const callback = vi.fn();

    const callbackId = await remote.watchAvailability(callback);

    expect(callbackId).toBeTypeOf('number');
    expect(provider.hasDevicesAvailable).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(true);
  });

  it('notifies active watchers only when availability changes', async () => {
    const { hooks, remote } = setup();
    const first = vi.fn();
    const second = vi.fn();

    await remote.watchAvailability(first);
    await remote.watchAvailability(second);
    first.mockClear();
    second.mockClear();

    hooks.setAvailable?.(true);
    hooks.setAvailable?.(true);
    hooks.setAvailable?.(false);

    expect(first.mock.calls).toEqual([[true], [false]]);
    expect(second.mock.calls).toEqual([[true], [false]]);
  });

  it('cancels one availability watcher without affecting the others', async () => {
    const { hooks, remote } = setup();
    const first = vi.fn();
    const second = vi.fn();
    const firstId = await remote.watchAvailability(first);

    await remote.watchAvailability(second);
    first.mockClear();
    second.mockClear();

    await remote.cancelWatchAvailability(firstId);
    hooks.setAvailable?.(true);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(true);
  });

  it('cancels every availability watcher when no id is given', async () => {
    const { hooks, remote } = setup();
    const callback = vi.fn();

    await remote.watchAvailability(callback);
    callback.mockClear();

    await remote.cancelWatchAvailability();
    hooks.setAvailable?.(true);

    expect(callback).not.toHaveBeenCalled();
  });

  it('rejects cancellation for an unknown watcher', async () => {
    const { remote } = setup();

    await expect(remote.cancelWatchAvailability(404)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('delegates the chooser prompt to the provider', async () => {
    const { provider, remote } = setup();

    await remote.prompt();

    expect(provider.requestCastSession).toHaveBeenCalledOnce();
  });

  it('rejects every operation when remote playback is disabled', async () => {
    const { provider, remote } = setup({ disabled: true });
    const callback = vi.fn();

    await expect(remote.watchAvailability(callback)).rejects.toBeInstanceOf(InvalidStateError);
    await expect(remote.cancelWatchAvailability()).rejects.toBeInstanceOf(InvalidStateError);
    await expect(remote.prompt()).rejects.toBeInstanceOf(InvalidStateError);

    expect(callback).not.toHaveBeenCalled();
    expect(provider.requestCastSession).not.toHaveBeenCalled();
  });
});
