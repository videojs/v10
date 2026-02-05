import { describe, expect, it } from 'vitest';
import type { Segment } from '../../types';
import { DEFAULT_FORWARD_BUFFER_CONFIG, getSegmentsToLoad } from '../forward-buffer';

// Helper to create test segments
const createSegment = (startTime: number, duration: number): Segment => ({
  id: `seg-${startTime}`,
  url: `https://example.com/seg-${startTime}.m4s`,
  startTime,
  duration,
});

describe('getSegmentsToLoad', () => {
  describe('basic forward buffer loading', () => {
    it('should load segments ahead of current time', () => {
      const segments = [
        createSegment(0, 6),
        createSegment(6, 6),
        createSegment(12, 6),
        createSegment(18, 6),
        createSegment(24, 6),
        createSegment(30, 6),
      ] as const;

      const bufferedSegments = [
        segments[0], // 0-6s buffered
        segments[1], // 6-12s buffered
      ] as const;

      const currentTime = 6; // Playing at 6s

      // With default 30s buffer, should load from 12s to 36s
      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime);

      expect(toLoad).toHaveLength(4); // Segments: 12, 18, 24, 30
      expect(toLoad[0]?.id).toBe('seg-12');
      expect(toLoad[3]?.id).toBe('seg-30');
    });

    it('should return empty array when buffer is sufficient', () => {
      const segments: Segment[] = [
        createSegment(0, 6),
        createSegment(6, 6),
        createSegment(12, 6),
        createSegment(18, 6),
      ];

      const bufferedSegments: Segment[] = segments; // All buffered

      const currentTime = 6;

      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime);

      expect(toLoad).toHaveLength(0);
    });

    it('should use custom buffer duration', () => {
      const segments: Segment[] = [
        createSegment(0, 6),
        createSegment(6, 6),
        createSegment(12, 6),
        createSegment(18, 6),
        createSegment(24, 6),
      ];

      const bufferedSegments: Segment[] = [];

      const currentTime = 0;
      const config = {
        ...DEFAULT_FORWARD_BUFFER_CONFIG,
        bufferDuration: 12, // Only 12s ahead instead of 30s
      };

      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime, config);

      expect(toLoad).toHaveLength(2); // Only load to 12s (segments 0-6, 6-12)
      expect(toLoad[0]?.id).toBe('seg-0');
      expect(toLoad[1]?.id).toBe('seg-6');
    });
  });

  describe('buffered segment filtering', () => {
    it('should skip already buffered segments', () => {
      const segments = [
        createSegment(0, 6),
        createSegment(6, 6),
        createSegment(12, 6),
        createSegment(18, 6),
        createSegment(24, 6),
      ] as const;

      // Segments 0, 6, 18 are buffered (sparse)
      const bufferedSegments: Segment[] = [segments[0], segments[1], segments[3]];

      const currentTime = 0;
      const config = {
        ...DEFAULT_FORWARD_BUFFER_CONFIG,
        bufferDuration: 24,
      };

      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime, config);

      // Should only load segment 12 to fill gap (18 is buffered, 24 is beyond target)
      expect(toLoad).toHaveLength(1);
      expect(toLoad[0]?.id).toBe('seg-12');
    });

    it('should handle all segments already buffered', () => {
      const segments: Segment[] = [createSegment(0, 6), createSegment(6, 6), createSegment(12, 6)];

      const bufferedSegments: Segment[] = segments;

      const currentTime = 0;

      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime);

      expect(toLoad).toHaveLength(0);
    });

    it('should handle no segments buffered', () => {
      const segments: Segment[] = [createSegment(0, 6), createSegment(6, 6), createSegment(12, 6)];

      const bufferedSegments: Segment[] = [];

      const currentTime = 0;
      const config = {
        ...DEFAULT_FORWARD_BUFFER_CONFIG,
        bufferDuration: 18,
      };

      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime, config);

      expect(toLoad).toHaveLength(3); // Load all 3 segments
    });
  });

  describe('edge cases', () => {
    it('should handle empty segment list', () => {
      const toLoad = getSegmentsToLoad([], [], 0);
      expect(toLoad).toHaveLength(0);
    });

    it('should handle currentTime before first segment', () => {
      const segments: Segment[] = [createSegment(10, 6), createSegment(16, 6)];

      const bufferedSegments: Segment[] = [];
      const currentTime = 0;

      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime);

      expect(toLoad).toHaveLength(2); // Load both segments within 30s
    });

    it('should handle currentTime after all segments', () => {
      const segments: Segment[] = [createSegment(0, 6), createSegment(6, 6)];

      const bufferedSegments: Segment[] = [];
      const currentTime = 100;

      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime);

      expect(toLoad).toHaveLength(0); // No segments in range
    });

    it('should not load segments beyond target', () => {
      const segments: Segment[] = [
        createSegment(0, 6),
        createSegment(6, 6),
        createSegment(12, 6),
        createSegment(18, 6),
        createSegment(24, 6),
        createSegment(30, 6),
        createSegment(36, 6),
        createSegment(42, 6),
      ];

      const bufferedSegments: Segment[] = [];
      const currentTime = 0;
      const config = {
        ...DEFAULT_FORWARD_BUFFER_CONFIG,
        bufferDuration: 18,
      };

      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime, config);

      // Should only load up to 18s (segments 0, 6, 12)
      expect(toLoad).toHaveLength(3);
      expect(toLoad[toLoad.length - 1]?.startTime).toBeLessThan(18);
    });
  });

  describe('variable segment durations', () => {
    it('should handle different segment lengths', () => {
      const segments: Segment[] = [
        createSegment(0, 10),
        createSegment(10, 5),
        createSegment(15, 8),
        createSegment(23, 12),
      ];

      const bufferedSegments: Segment[] = [];
      const currentTime = 0;
      const config = {
        ...DEFAULT_FORWARD_BUFFER_CONFIG,
        bufferDuration: 20,
      };

      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime, config);

      // Load segments covering 0-20s (segments 0, 10, 15)
      expect(toLoad).toHaveLength(3);
    });
  });

  describe('discontiguous buffering (seek scenarios)', () => {
    it('should fill gaps and extend buffer after seek', () => {
      const segments = [
        createSegment(0, 6),
        createSegment(6, 6),
        createSegment(12, 6),
        createSegment(18, 6),
        createSegment(24, 6),
        createSegment(30, 6),
      ] as const;

      // After seek: have [0-12) and [18-30), missing [12-18)
      const bufferedSegments: Segment[] = [
        segments[0], // 0-6
        segments[1], // 6-12
        segments[3], // 18-24
        segments[4], // 24-30
      ];

      const currentTime = 7; // Playing at 7s
      const config = {
        ...DEFAULT_FORWARD_BUFFER_CONFIG,
        bufferDuration: 24, // Buffer to 7+24=31s
      };

      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime, config);

      // Should load seg-12 (fills gap) and seg-30 (extends to 31s)
      expect(toLoad).toHaveLength(2);
      expect(toLoad[0]?.id).toBe('seg-12');
      expect(toLoad[1]?.id).toBe('seg-30');
    });
  });

  describe('playback position', () => {
    it('should load ahead from current position', () => {
      const segments = [
        createSegment(0, 6),
        createSegment(6, 6),
        createSegment(12, 6),
        createSegment(18, 6),
        createSegment(24, 6),
        createSegment(30, 6),
      ] as const;

      // Currently buffered: 0-18s
      const bufferedSegments: Segment[] = [segments[0], segments[1], segments[2]];

      const currentTime = 12; // Playing at 12s
      const config = {
        ...DEFAULT_FORWARD_BUFFER_CONFIG,
        bufferDuration: 30,
      };

      // Should load from 18s to 42s (12 + 30)
      const toLoad = getSegmentsToLoad(segments, bufferedSegments, currentTime, config);

      expect(toLoad).toHaveLength(3); // Segments 18, 24, 30
      expect(toLoad[0]?.id).toBe('seg-18');
    });
  });
});
