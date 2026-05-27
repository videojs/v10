import { afterEach, describe, expect, it } from 'vitest';

import { isWebKitAirplayCapable, supportsWebKitAirplay } from '../webkit';

// jsdom lacks WebKit's AirPlay APIs, so stub the global support flag per test.
function stubWebKit(present: boolean) {
  const key = 'WebKitPlaybackTargetAvailabilityEvent';
  if (present) {
    (globalThis as unknown as Record<string, unknown>)[key] = class {};
  } else {
    delete (globalThis as unknown as Record<string, unknown>)[key];
  }
}

describe('webkit', () => {
  afterEach(() => stubWebKit(false));

  describe('supportsWebKitAirplay', () => {
    it('returns true when the WebKit availability event is present', () => {
      stubWebKit(true);
      expect(supportsWebKitAirplay()).toBe(true);
    });

    it('returns false when absent', () => {
      stubWebKit(false);
      expect(supportsWebKitAirplay()).toBe(false);
    });
  });

  describe('isWebKitAirplayCapable', () => {
    it('returns true when supported and the media exposes the AirPlay flag', () => {
      stubWebKit(true);
      const media = { webkitCurrentPlaybackTargetIsWireless: false } as unknown as EventTarget;
      expect(isWebKitAirplayCapable(media)).toBe(true);
    });

    it('returns false when WebKit is unsupported', () => {
      stubWebKit(false);
      const media = { webkitCurrentPlaybackTargetIsWireless: false } as unknown as EventTarget;
      expect(isWebKitAirplayCapable(media)).toBe(false);
    });

    it('returns false when the media lacks the AirPlay flag', () => {
      stubWebKit(true);
      expect(isWebKitAirplayCapable(new EventTarget())).toBe(false);
    });
  });
});
