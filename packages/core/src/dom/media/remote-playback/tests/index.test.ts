import { describe, expect, it, vi } from 'vitest';
import { RemotePlaybackBridge } from '..';

describe('RemotePlaybackBridge', () => {
  it('runs the prompt hook', async () => {
    const prompt = vi.fn();
    const remote = new RemotePlaybackBridge({ prompt });

    await remote.prompt();

    expect(prompt).toHaveBeenCalledOnce();
  });

  it('throws when disabled', async () => {
    const remote = new RemotePlaybackBridge({
      disabled: () => true,
      prompt: vi.fn(),
    });

    await expect(remote.prompt()).rejects.toMatchObject({ name: 'InvalidStateError' });
  });

  it('notifies availability watchers', async () => {
    const callback = vi.fn();
    const remote = new RemotePlaybackBridge({
      prompt: vi.fn(),
      availability: () => true,
    });

    await remote.watchAvailability(callback);
    await Promise.resolve();
    remote.setAvailability(false);

    expect(callback).toHaveBeenCalledWith(true);
    expect(callback).toHaveBeenCalledWith(false);
  });

  it('notifies availability watchers with initial unavailable state', async () => {
    const callback = vi.fn();
    const remote = new RemotePlaybackBridge({
      prompt: vi.fn(),
      availability: () => false,
    });

    await remote.watchAvailability(callback);
    await Promise.resolve();

    expect(callback).toHaveBeenCalledWith(false);
  });

  it('does not notify canceled availability watchers', async () => {
    const callback = vi.fn();
    const remote = new RemotePlaybackBridge({
      prompt: vi.fn(),
      availability: () => true,
    });

    const watch = remote.watchAvailability(callback);
    await remote.cancelWatchAvailability();
    await watch;
    await Promise.resolve();

    expect(callback).not.toHaveBeenCalled();
  });
});
