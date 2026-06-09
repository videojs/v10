import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScreenOrientationLock } from '../orientation';

function stubOrientation(orientation: Partial<ScreenOrientation>) {
  vi.stubGlobal('screen', { orientation });
}

describe('createScreenOrientationLock', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('locks landscape by default', async () => {
    const orientation = {
      lock: vi.fn(async () => {}),
      unlock: vi.fn(),
    };
    stubOrientation(orientation);

    const screenLock = createScreenOrientationLock();

    await screenLock.lock();

    expect(orientation.lock).toHaveBeenCalledWith('landscape');
  });

  it('locks the configured orientation type', async () => {
    const orientation = {
      lock: vi.fn(async () => {}),
      unlock: vi.fn(),
    };
    stubOrientation(orientation);

    const screenLock = createScreenOrientationLock({ type: 'portrait' });

    await screenLock.lock();

    expect(orientation.lock).toHaveBeenCalledWith('portrait');
  });

  it('unlocks only after a successful lock', async () => {
    const orientation = {
      lock: vi.fn(async () => {}),
      unlock: vi.fn(),
    };
    stubOrientation(orientation);

    const screenLock = createScreenOrientationLock();

    screenLock.unlock();
    await screenLock.lock();
    await screenLock.lock();
    screenLock.unlock();
    screenLock.unlock();

    expect(orientation.lock).toHaveBeenCalledTimes(1);
    expect(orientation.unlock).toHaveBeenCalledTimes(1);
  });

  it('ignores missing browser APIs', async () => {
    stubOrientation({});

    const screenLock = createScreenOrientationLock();

    await expect(screenLock.lock()).resolves.toBeUndefined();
    expect(() => screenLock.unlock()).not.toThrow();
  });

  it('releases orientation when unlock runs before lock settles', async () => {
    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    const orientation = {
      lock: vi.fn(() => lockPromise),
      unlock: vi.fn(),
    };
    stubOrientation(orientation);

    const screenLock = createScreenOrientationLock();
    const lockTask = screenLock.lock();

    screenLock.unlock();
    resolveLock();
    await lockTask;

    expect(orientation.unlock).toHaveBeenCalledTimes(1);
  });

  it('does not release a newer active lock when an older lock settles', async () => {
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;

    const firstLock = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const secondLock = new Promise<void>((resolve) => {
      resolveSecond = resolve;
    });

    const orientation = {
      lock: vi.fn<ScreenOrientation['lock']>().mockReturnValueOnce(firstLock).mockReturnValueOnce(secondLock),
      unlock: vi.fn(),
    };
    stubOrientation(orientation);

    const screenLock = createScreenOrientationLock();
    const firstTask = screenLock.lock();

    screenLock.unlock();
    const secondTask = screenLock.lock();

    resolveSecond();
    await secondTask;

    resolveFirst();
    await firstTask;

    expect(orientation.unlock).not.toHaveBeenCalled();

    screenLock.unlock();

    expect(orientation.unlock).toHaveBeenCalledTimes(1);
  });

  it('ignores rejected locks and thrown unlocks', async () => {
    const orientation = {
      lock: vi.fn<ScreenOrientation['lock']>().mockRejectedValue(new Error('NotAllowedError')),
      unlock: vi.fn(() => {
        throw new Error('InvalidStateError');
      }),
    };
    stubOrientation(orientation);

    const rejectedLock = createScreenOrientationLock();

    await expect(rejectedLock.lock()).resolves.toBeUndefined();
    rejectedLock.unlock();

    expect(orientation.unlock).not.toHaveBeenCalled();

    const acceptedLock = createScreenOrientationLock();
    orientation.lock.mockResolvedValue(undefined);

    await acceptedLock.lock();

    expect(() => acceptedLock.unlock()).not.toThrow();
  });
});
