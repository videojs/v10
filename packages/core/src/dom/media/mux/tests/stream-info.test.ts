import type { LevelDetails } from 'hls.js';
import { describe, expect, it } from 'vitest';

import { getStreamInfoFromLevelDetails } from '../stream-info';

function makeLevelDetails(overrides: Partial<LevelDetails>): LevelDetails {
  return {
    live: false,
    type: 'VOD',
    targetduration: 6,
    partTarget: 0,
    partList: null,
    ...overrides,
  } as unknown as LevelDetails;
}

describe('getStreamInfoFromLevelDetails', () => {
  describe('on-demand (VOD)', () => {
    it('returns on-demand for a VOD playlist', () => {
      const info = getStreamInfoFromLevelDetails(makeLevelDetails({ live: false, type: 'VOD' }));
      expect(info.streamType).toBe('on-demand');
    });

    it('returns NaN targetLiveWindow for VOD', () => {
      const info = getStreamInfoFromLevelDetails(makeLevelDetails({ live: false, type: 'VOD' }));
      expect(info.targetLiveWindow).toBeNaN();
    });

    it('returns NaN liveEdgeOffset for VOD', () => {
      const info = getStreamInfoFromLevelDetails(makeLevelDetails({ live: false, type: 'VOD' }));
      expect(info.liveEdgeOffset).toBeNaN();
    });

    it('returns on-demand when live is false regardless of type', () => {
      const info = getStreamInfoFromLevelDetails(makeLevelDetails({ live: false, type: null }));
      expect(info.streamType).toBe('on-demand');
    });
  });

  describe('live (sliding window)', () => {
    it('returns live for a LIVE playlist', () => {
      const info = getStreamInfoFromLevelDetails(makeLevelDetails({ live: true, type: 'LIVE' }));
      expect(info.streamType).toBe('live');
    });

    it('returns 0 targetLiveWindow for sliding-window live', () => {
      const info = getStreamInfoFromLevelDetails(makeLevelDetails({ live: true, type: 'LIVE' }));
      expect(info.targetLiveWindow).toBe(0);
    });

    it('returns live when type is null', () => {
      const info = getStreamInfoFromLevelDetails(makeLevelDetails({ live: true, type: null }));
      expect(info.streamType).toBe('live');
      expect(info.targetLiveWindow).toBe(0);
    });

    it('computes liveEdgeOffset as 3× targetduration for regular live', () => {
      const info = getStreamInfoFromLevelDetails(
        makeLevelDetails({ live: true, type: 'LIVE', targetduration: 6, partTarget: 0 })
      );
      expect(info.liveEdgeOffset).toBe(18);
    });
  });

  describe('DVR (EVENT playlist)', () => {
    it('returns live for an EVENT playlist', () => {
      const info = getStreamInfoFromLevelDetails(makeLevelDetails({ live: true, type: 'EVENT' }));
      expect(info.streamType).toBe('live');
    });

    it('returns Infinity targetLiveWindow for EVENT (DVR)', () => {
      const info = getStreamInfoFromLevelDetails(makeLevelDetails({ live: true, type: 'EVENT' }));
      expect(info.targetLiveWindow).toBe(Infinity);
    });

    it('computes liveEdgeOffset as 3× targetduration for EVENT playlist', () => {
      const info = getStreamInfoFromLevelDetails(
        makeLevelDetails({ live: true, type: 'EVENT', targetduration: 4, partTarget: 0 })
      );
      expect(info.liveEdgeOffset).toBe(12);
    });
  });

  describe('LL-HLS', () => {
    it('uses 2× partTarget for liveEdgeOffset when partTarget is set', () => {
      const info = getStreamInfoFromLevelDetails(
        makeLevelDetails({ live: true, type: 'LIVE', targetduration: 6, partTarget: 0.5 })
      );
      expect(info.liveEdgeOffset).toBeCloseTo(1.0);
    });

    it('falls back to 3× targetduration when partTarget is 0', () => {
      const info = getStreamInfoFromLevelDetails(
        makeLevelDetails({ live: true, type: 'LIVE', targetduration: 6, partTarget: 0 })
      );
      expect(info.liveEdgeOffset).toBe(18);
    });
  });
});
