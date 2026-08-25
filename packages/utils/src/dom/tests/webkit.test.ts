import { afterEach, describe, expect, it } from 'vite-plus/test';

import { isWebKitAirPlayCapable, supportsWebKitAirPlay } from '../webkit';

// jsdom lacks WebKit's AirPlay APIs, so stub the global support flag per test.
function stubWebKit(present: boolean) {
  const key = 'WebKitPlaybackTargetAvailabilityEvent';
  if (present) {
    Object.defineProperty(globalThis, key, { configurable: true, value: class {} });
  } else {
    Reflect.deleteProperty(globalThis, key);
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
      const media = Object.assign(new EventTarget(), { webkitCurrentPlaybackTargetIsWireless: false });
      expect(isWebKitAirPlayCapable(media)).toBe(true);
    });

    it('returns false when WebKit is unsupported', () => {
      stubWebKit(false);
      const media = Object.assign(new EventTarget(), { webkitCurrentPlaybackTargetIsWireless: false });
      expect(isWebKitAirPlayCapable(media)).toBe(false);
    });

    it('returns false when the media lacks the AirPlay flag', () => {
      stubWebKit(true);
      expect(isWebKitAirPlayCapable(new EventTarget())).toBe(false);
    });
  });
});
