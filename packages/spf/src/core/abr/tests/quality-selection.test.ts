import { describe, expect, it } from 'vitest';
import type { UnresolvedVideoTrack } from '../../types';
import { DEFAULT_QUALITY_CONFIG, selectQuality } from '../quality-selection';

// Helper to create test tracks
const createTrack = (id: string, bandwidth: number, width = 1920, height = 1080): UnresolvedVideoTrack => ({
  type: 'video',
  id,
  url: `https://example.com/${id}.m3u8`,
  bandwidth,
  width,
  height,
  mimeType: 'video/mp4',
  par: '1:1',
  sar: '1:1',
  scanType: 'progressive',
});

describe('selectQuality', () => {
  describe('basic track selection', () => {
    it('should select highest quality that fits within bandwidth', () => {
      const tracks: UnresolvedVideoTrack[] = [
        createTrack('360p', 500_000),
        createTrack('480p', 1_000_000),
        createTrack('720p', 2_000_000),
        createTrack('1080p', 4_000_000),
      ];

      // With 2.5 Mbps, should select 720p (2 Mbps)
      const selected = selectQuality(tracks, 2_500_000);

      expect(selected?.id).toBe('720p');
    });

    it('should select lowest quality when bandwidth is very low', () => {
      const tracks: UnresolvedVideoTrack[] = [
        createTrack('360p', 500_000),
        createTrack('480p', 1_000_000),
        createTrack('720p', 2_000_000),
      ];

      // With 200 Kbps, should select 360p
      const selected = selectQuality(tracks, 200_000);

      expect(selected?.id).toBe('360p');
    });

    it('should select highest quality when bandwidth is very high', () => {
      const tracks: UnresolvedVideoTrack[] = [
        createTrack('360p', 500_000),
        createTrack('480p', 1_000_000),
        createTrack('720p', 2_000_000),
        createTrack('1080p', 4_000_000),
      ];

      // With 10 Mbps, should select 1080p
      const selected = selectQuality(tracks, 10_000_000);

      expect(selected?.id).toBe('1080p');
    });
  });

  describe('safety margin', () => {
    it('should apply safety margin (default 0.85)', () => {
      const tracks: UnresolvedVideoTrack[] = [createTrack('720p', 2_000_000), createTrack('1080p', 4_000_000)];

      // To select 1080p (4 Mbps), need 4M / 0.85 ≈ 4.7 Mbps
      // With 4.6 Mbps, should select 720p (15% safety margin)
      const selected1 = selectQuality(tracks, 4_600_000);
      expect(selected1?.id).toBe('720p');

      // With 4.8 Mbps, should select 1080p
      const selected2 = selectQuality(tracks, 4_800_000);
      expect(selected2?.id).toBe('1080p');
    });

    it('should select 720p with exactly required bandwidth', () => {
      const tracks: UnresolvedVideoTrack[] = [createTrack('720p', 2_000_000), createTrack('1080p', 4_000_000)];

      // Exactly 2M / 0.85 ≈ 2.35 Mbps required for 720p
      const selected = selectQuality(tracks, 2_350_000);
      expect(selected?.id).toBe('720p');
    });

    it('should use custom safety margin', () => {
      const tracks: UnresolvedVideoTrack[] = [createTrack('720p', 2_000_000), createTrack('1080p', 4_000_000)];

      const config = {
        ...DEFAULT_QUALITY_CONFIG,
        safetyMargin: 0.9, // More conservative (need more headroom)
      };

      // With 0.9 margin, need 4M / 0.9 ≈ 4.4 Mbps
      const selected = selectQuality(tracks, 4_500_000, config);
      expect(selected?.id).toBe('1080p');
    });
  });

  describe('edge cases', () => {
    it('should return undefined for empty track list', () => {
      const selected = selectQuality([], 5_000_000);
      expect(selected).toBeUndefined();
    });

    it('should handle single track', () => {
      const tracks: UnresolvedVideoTrack[] = [createTrack('720p', 2_000_000)];

      // Should select the only available track
      const selected = selectQuality(tracks, 1_000_000);
      expect(selected?.id).toBe('720p');
    });

    it('should handle tracks with same bandwidth', () => {
      const tracks: UnresolvedVideoTrack[] = [
        createTrack('720p', 2_000_000, 1280, 720),
        createTrack('720p-high', 2_000_000, 1920, 1080), // Same bitrate, higher res
      ];

      // Should prefer higher resolution at same bandwidth
      const selected = selectQuality(tracks, 2_500_000);
      expect(selected?.id).toBe('720p-high');
    });

    it('should handle zero bandwidth', () => {
      const tracks: UnresolvedVideoTrack[] = [createTrack('360p', 500_000), createTrack('720p', 2_000_000)];

      // Should select lowest quality
      const selected = selectQuality(tracks, 0);
      expect(selected?.id).toBe('360p');
    });

    it('should handle tracks without width/height', () => {
      const track1: UnresolvedVideoTrack = {
        type: 'video',
        id: 'track1',
        url: 'https://example.com/1.m3u8',
        bandwidth: 1_000_000,
        mimeType: 'video/mp4',
        par: '1:1',
        sar: '1:1',
        scanType: 'progressive',
      };

      const track2: UnresolvedVideoTrack = {
        type: 'video',
        id: 'track2',
        url: 'https://example.com/2.m3u8',
        bandwidth: 1_000_000,
        width: 1280,
        height: 720,
        mimeType: 'video/mp4',
        par: '1:1',
        sar: '1:1',
        scanType: 'progressive',
      };

      const tracks = [track1, track2];

      // Should handle missing width/height gracefully
      const selected = selectQuality(tracks, 1_500_000);
      expect(selected).toBeDefined();
    });
  });

  describe('unsorted track lists', () => {
    it('should handle tracks in random order', () => {
      const tracks: UnresolvedVideoTrack[] = [
        createTrack('1080p', 4_000_000),
        createTrack('360p', 500_000),
        createTrack('720p', 2_000_000),
        createTrack('480p', 1_000_000),
      ];

      // With 2.5 Mbps, should still select 720p despite unsorted list
      const selected = selectQuality(tracks, 2_500_000);
      expect(selected?.id).toBe('720p');
    });

    it('should handle descending order', () => {
      const tracks: UnresolvedVideoTrack[] = [
        createTrack('1080p', 4_000_000),
        createTrack('720p', 2_000_000),
        createTrack('480p', 1_000_000),
        createTrack('360p', 500_000),
      ];

      const selected = selectQuality(tracks, 1_500_000);
      expect(selected?.id).toBe('480p');
    });
  });

  describe('realistic ABR scenarios', () => {
    const abrLadder: UnresolvedVideoTrack[] = [
      createTrack('240p', 300_000, 426, 240),
      createTrack('360p', 600_000, 640, 360),
      createTrack('480p', 1_200_000, 854, 480),
      createTrack('720p', 2_400_000, 1280, 720),
      createTrack('1080p', 4_800_000, 1920, 1080),
    ];

    it('should handle startup with low initial estimate', () => {
      // Startup: conservative 1 Mbps estimate
      const selected = selectQuality(abrLadder, 1_000_000);
      expect(selected?.id).toBe('360p'); // Stay conservative
    });

    it('should handle steady state with good bandwidth', () => {
      // Good Wi-Fi: 5 Mbps
      const selected = selectQuality(abrLadder, 5_000_000);
      expect(selected?.id).toBe('720p'); // Upgrade threshold keeps it from 1080p
    });

    it('should handle bandwidth drop gracefully', () => {
      // Bandwidth drops to 1.5 Mbps
      const selected = selectQuality(abrLadder, 1_500_000);
      expect(selected?.id).toBe('480p');
    });

    it('should handle gradual bandwidth increase', () => {
      const estimates = [
        1_000_000, // 360p
        2_000_000, // 480p
        3_000_000, // 720p
        6_000_000, // 1080p
      ];

      const selections = estimates.map((bw) => selectQuality(abrLadder, bw));

      expect(selections[0]?.id).toBe('360p');
      expect(selections[1]?.id).toBe('480p');
      expect(selections[2]?.id).toBe('720p');
      expect(selections[3]?.id).toBe('1080p');
    });
  });

  describe('resolution preference at same bandwidth', () => {
    it('should prefer higher resolution when bitrates are equal', () => {
      const tracks: UnresolvedVideoTrack[] = [
        createTrack('720p-low', 2_000_000, 1280, 720),
        createTrack('1080p-low', 2_000_000, 1920, 1080),
      ];

      const selected = selectQuality(tracks, 2_500_000);
      expect(selected?.id).toBe('1080p-low');
    });

    it('should compare by pixel count (width × height)', () => {
      const tracks: UnresolvedVideoTrack[] = [
        createTrack('wide', 2_000_000, 1920, 800), // 1,536,000 pixels
        createTrack('tall', 2_000_000, 1280, 1440), // 1,843,200 pixels
      ];

      const selected = selectQuality(tracks, 2_500_000);
      expect(selected?.id).toBe('tall'); // More total pixels
    });
  });

  describe('safety margin behavior', () => {
    it('should enforce 15% headroom with default config', () => {
      const tracks: UnresolvedVideoTrack[] = [createTrack('720p', 2_000_000), createTrack('1080p', 4_000_000)];

      // To select 1080p: need 4M / 0.85 ≈ 4.7 Mbps (15% headroom)

      // At 4.5 Mbps: below safety threshold for 1080p, select 720p
      const selected1 = selectQuality(tracks, 4_500_000);
      expect(selected1?.id).toBe('720p');

      // At 4.8 Mbps: above safety threshold for 1080p, select 1080p
      const selected2 = selectQuality(tracks, 4_800_000);
      expect(selected2?.id).toBe('1080p');
    });

    it('should always select highest quality that fits with margin', () => {
      const tracks: UnresolvedVideoTrack[] = [
        createTrack('360p', 500_000),
        createTrack('480p', 1_000_000),
        createTrack('720p', 2_000_000),
      ];

      // With 2.4 Mbps: can fit 720p (needs 2M/0.85 = 2.35M)
      const selected = selectQuality(tracks, 2_400_000);
      expect(selected?.id).toBe('720p');
    });
  });
});
