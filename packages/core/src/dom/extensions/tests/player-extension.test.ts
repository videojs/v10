import { describe, expect, it, vi } from 'vite-plus/test';

import type { PlayerTarget } from '../../player';
import { type PlayerExtension, PlayerExtensionCoordinator } from '../player-extension';

class TrackingExtension implements PlayerExtension {
  attach = vi.fn<(target: PlayerTarget) => void>();
  detach = vi.fn();
  destroy = vi.fn();
}

class MutedExtension implements PlayerExtension {
  get mediaOverride() {
    return { muted: true };
  }
}

function createTarget(): PlayerTarget {
  return { media: document.createElement('video'), container: null };
}

describe('PlayerExtensionCoordinator', () => {
  it('attaches a registered extension to the current target immediately', () => {
    const coordinator = new PlayerExtensionCoordinator(() => {});
    const target = createTarget();
    const extension = new TrackingExtension();

    coordinator.attach(target);
    coordinator.register(extension);

    expect(extension.attach).toHaveBeenCalledWith(target);
    expect(coordinator.get(TrackingExtension)).toBe(extension);
  });

  it('attaches extensions registered before a target once one arrives', () => {
    const coordinator = new PlayerExtensionCoordinator(() => {});
    const target = createTarget();
    const extension = new TrackingExtension();

    coordinator.register(extension);
    expect(extension.attach).not.toHaveBeenCalled();

    coordinator.attach(target);
    expect(extension.attach).toHaveBeenCalledWith(target);
  });

  it('notifies on register and release', () => {
    const onChange = vi.fn();
    const coordinator = new PlayerExtensionCoordinator(onChange);
    const extension = new TrackingExtension();

    const remove = coordinator.register(extension);

    expect(onChange).toHaveBeenCalledTimes(1);

    remove();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(coordinator.get(TrackingExtension)).toBeUndefined();
  });

  it('is a no-op to register the same instance twice', () => {
    const onChange = vi.fn();
    const coordinator = new PlayerExtensionCoordinator(onChange);
    const extension = new TrackingExtension();

    coordinator.attach(createTarget());
    coordinator.register(extension);
    coordinator.register(extension);

    expect(extension.attach).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('replaces an earlier instance of the same class and detaches it', () => {
    const coordinator = new PlayerExtensionCoordinator(() => {});
    const first = new TrackingExtension();
    const second = new TrackingExtension();

    coordinator.attach(createTarget());

    const removeFirst = coordinator.register(first);

    coordinator.register(second);

    expect(first.detach).toHaveBeenCalledTimes(1);
    expect(second.attach).toHaveBeenCalledTimes(1);
    expect(coordinator.get(TrackingExtension)).toBe(second);

    // A stale release callback cannot remove the newer instance.
    removeFirst();
    expect(coordinator.get(TrackingExtension)).toBe(second);
  });

  it('moves extensions between targets and ignores an unchanged one', () => {
    const coordinator = new PlayerExtensionCoordinator(() => {});
    const extension = new TrackingExtension();
    const first = createTarget();
    const second = createTarget();

    coordinator.register(extension);
    coordinator.attach(first);
    coordinator.attach({ media: first.media, container: first.container });

    expect(extension.attach).toHaveBeenCalledTimes(1);
    expect(extension.detach).not.toHaveBeenCalled();

    coordinator.attach(second);

    expect(extension.detach).toHaveBeenCalledTimes(1);
    expect(extension.attach).toHaveBeenCalledTimes(2);
    expect(extension.attach).toHaveBeenLastCalledWith(second);
  });

  it('detaches extensions without destroying them', () => {
    const coordinator = new PlayerExtensionCoordinator(() => {});
    const extension = new TrackingExtension();

    coordinator.attach(createTarget());
    coordinator.register(extension);
    coordinator.detach();

    expect(extension.detach).toHaveBeenCalledTimes(1);
    expect(extension.destroy).not.toHaveBeenCalled();

    // Removing while detached must not detach again.
    coordinator.destroy();
    expect(extension.detach).toHaveBeenCalledTimes(1);
    expect(extension.destroy).not.toHaveBeenCalled();
    expect(coordinator.size).toBe(0);
  });

  it('returns the media itself while no extension is registered', () => {
    const coordinator = new PlayerExtensionCoordinator(() => {});
    const { media } = createTarget();

    expect(coordinator.wrap(media)).toBe(media);
  });

  it('wraps the media once an extension is registered', () => {
    const coordinator = new PlayerExtensionCoordinator(() => {});
    const video = document.createElement('video');
    const remove = coordinator.register(new MutedExtension());
    const wrapped = coordinator.wrap(video);

    expect(wrapped).not.toBe(video);
    expect(wrapped.muted).toBe(true);
    expect(wrapped instanceof HTMLVideoElement).toBe(true);

    // The facade tracks the live registry, so removal shows through without re-wrapping.
    remove();
    expect(wrapped.muted).toBe(false);
  });
});
