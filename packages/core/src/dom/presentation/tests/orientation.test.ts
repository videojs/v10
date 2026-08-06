import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScreenOrientationLock } from '../orientation';

function stubOrientation(orientation: Partial<ScreenOrientation>) {
  vi.stubGlobal('screen', { orientation });
}

describe('createScreenOrientationLock', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('locks the requested orientation type', async () => {
    const orientation = {
      lock: vi.fn(async () => {}),
      unlock: vi.fn(),
    };
    stubOrientation(orientation);

    const screenLock = createScreenOrientationLock();

    await screenLock.lock('portrait');

    expect(orientation.lock).toHaveBeenCalledWith('portrait');
  });

  it('re-locks when the requested type changes', async () => {
    const orientation = {
      lock: vi.fn(async () => {}),
      unlock: vi.fn(),
    };
    stubOrientation(orientation);

    const screenLock = createScreenOrientationLock();

    await screenLock.lock('landscape');
    await screenLock.lock('portrait');

    expect(orientation.lock).toHaveBeenNthCalledWith(1, 'landscape');
    expect(orientation.lock).toHaveBeenNthCalledWith(2, 'portrait');
    expect(orientation.unlock).not.toHaveBeenCalled();
  });

  it('unlocks only after a successful lock', async () => {
    const orientation = {
      lock: vi.fn(async () => {}),
      unlock: vi.fn(),
    };
    stubOrientation(orientation);

    const screenLock = createScreenOrientationLock();

    screenLock.unlock();
    await screenLock.lock('landscape');
    await screenLock.lock('landscape');
    screenLock.unlock();
    screenLock.unlock();

    expect(orientation.lock).toHaveBeenCalledTimes(1);
    expect(orientation.unlock).toHaveBeenCalledTimes(1);
  });

  it('ignores missing browser APIs', async () => {
    stubOrientation({});

    const screenLock = createScreenOrientationLock();

    await expect(screenLock.lock('landscape')).resolves.toBeUndefined();
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
    const lockTask = screenLock.lock('landscape');

    screenLock.unlock();
    resolveLock();
    await lockTask;

    expect(orientation.unlock).toHaveBeenCalledTimes(1);
  });

  it('commits nothing when a lock request is superseded before it settles', async () => {
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
    const firstTask = screenLock.lock('landscape');
    const secondTask = screenLock.lock('portrait');

    resolveFirst();
    await firstTask;
    resolveSecond();
    await secondTask;

    // The superseded landscape request must not leave the lock believing it
    // holds landscape, so a later unlock still releases the portrait lock.
    screenLock.unlock();

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
    const firstTask = screenLock.lock('landscape');

    screenLock.unlock();
    const secondTask = screenLock.lock('landscape');

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

    await expect(rejectedLock.lock('landscape')).resolves.toBeUndefined();
    rejectedLock.unlock();

    expect(orientation.unlock).not.toHaveBeenCalled();

    const acceptedLock = createScreenOrientationLock();
    orientation.lock.mockResolvedValue(undefined);

    await acceptedLock.lock('landscape');

    expect(() => acceptedLock.unlock()).not.toThrow();
  });
});
