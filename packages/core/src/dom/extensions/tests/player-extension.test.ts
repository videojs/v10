import { describe, expect, it, vi } from 'vite-plus/test';

import type { PlayerTarget } from '../../player';
import { type PlayerExtension, PlayerExtensionHost } from '../player-extension';

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

describe('PlayerExtensionHost', () => {
  it('attaches a registered extension to the current target immediately', () => {
    const host = new PlayerExtensionHost(() => {});
    const target = createTarget();
    const extension = new TrackingExtension();

    host.attach(target);
    host.add(extension);

    expect(extension.attach).toHaveBeenCalledWith(target);
    expect(host.get(TrackingExtension)).toBe(extension);
  });

  it('attaches extensions registered before a target once one arrives', () => {
    const host = new PlayerExtensionHost(() => {});
    const target = createTarget();
    const extension = new TrackingExtension();

    host.add(extension);
    expect(extension.attach).not.toHaveBeenCalled();

    host.attach(target);
    expect(extension.attach).toHaveBeenCalledWith(target);
  });

  it('notifies on add and remove', () => {
    const onChange = vi.fn();
    const host = new PlayerExtensionHost(onChange);
    const extension = new TrackingExtension();

    const remove = host.add(extension);

    expect(onChange).toHaveBeenCalledTimes(1);

    remove();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(host.get(TrackingExtension)).toBeUndefined();
  });

  it('is a no-op to add the same instance twice', () => {
    const onChange = vi.fn();
    const host = new PlayerExtensionHost(onChange);
    const extension = new TrackingExtension();

    host.attach(createTarget());
    host.add(extension);
    host.add(extension);

    expect(extension.attach).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('replaces an earlier instance of the same class and detaches it', () => {
    const host = new PlayerExtensionHost(() => {});
    const first = new TrackingExtension();
    const second = new TrackingExtension();

    host.attach(createTarget());

    const removeFirst = host.add(first);

    host.add(second);

    expect(first.detach).toHaveBeenCalledTimes(1);
    expect(second.attach).toHaveBeenCalledTimes(1);
    expect(host.get(TrackingExtension)).toBe(second);

    // A stale release callback cannot remove the newer instance.
    removeFirst();
    expect(host.get(TrackingExtension)).toBe(second);
  });

  it('moves extensions between targets and ignores an unchanged one', () => {
    const host = new PlayerExtensionHost(() => {});
    const extension = new TrackingExtension();
    const first = createTarget();
    const second = createTarget();

    host.add(extension);
    host.attach(first);
    host.attach({ media: first.media, container: first.container });

    expect(extension.attach).toHaveBeenCalledTimes(1);
    expect(extension.detach).not.toHaveBeenCalled();

    host.attach(second);

    expect(extension.detach).toHaveBeenCalledTimes(1);
    expect(extension.attach).toHaveBeenCalledTimes(2);
    expect(extension.attach).toHaveBeenLastCalledWith(second);
  });

  it('detaches extensions without destroying them', () => {
    const host = new PlayerExtensionHost(() => {});
    const extension = new TrackingExtension();

    host.attach(createTarget());
    host.add(extension);
    host.detach();

    expect(extension.detach).toHaveBeenCalledTimes(1);
    expect(extension.destroy).not.toHaveBeenCalled();

    // Removing while detached must not detach again.
    host.destroy();
    expect(extension.detach).toHaveBeenCalledTimes(1);
    expect(extension.destroy).not.toHaveBeenCalled();
    expect(host.size).toBe(0);
  });

  it('returns the media itself while no extension is registered', () => {
    const host = new PlayerExtensionHost(() => {});
    const { media } = createTarget();

    expect(host.wrap(media)).toBe(media);
  });

  it('wraps the media once an extension is registered', () => {
    const host = new PlayerExtensionHost(() => {});
    const video = document.createElement('video');
    const remove = host.add(new MutedExtension());
    const wrapped = host.wrap(video);

    expect(wrapped).not.toBe(video);
    expect(wrapped.muted).toBe(true);
    expect(wrapped instanceof HTMLVideoElement).toBe(true);

    // The facade tracks the live registry, so removal shows through without re-wrapping.
    remove();
    expect(wrapped.muted).toBe(false);
  });
});
