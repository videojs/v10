import { afterEach, describe, expect, it } from 'vitest';

import { isWebKitAirPlayCapable, supportsWebKitAirPlay } from '../webkit';

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

  describe('supportsWebKitAirPlay', () => {
    it('returns true when the WebKit availability event is present', () => {
      stubWebKit(true);
      expect(supportsWebKitAirPlay()).toBe(true);
    });

    it('returns false when absent', () => {
      stubWebKit(false);
      expect(supportsWebKitAirPlay()).toBe(false);
    });
  });

  describe('isWebKitAirPlayCapable', () => {
    it('returns true when supported and the media exposes the AirPlay flag', () => {
      stubWebKit(true);
      const media = { webkitCurrentPlaybackTargetIsWireless: false } as unknown as EventTarget;
      expect(isWebKitAirPlayCapable(media)).toBe(true);
    });

    it('returns false when WebKit is unsupported', () => {
      stubWebKit(false);
      const media = { webkitCurrentPlaybackTargetIsWireless: false } as unknown as EventTarget;
      expect(isWebKitAirPlayCapable(media)).toBe(false);
    });

    it('returns false when the media lacks the AirPlay flag', () => {
      stubWebKit(true);
      expect(isWebKitAirPlayCapable(new EventTarget())).toBe(false);
    });
  });
});
