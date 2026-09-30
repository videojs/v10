import { HTMLVideoAdapter } from '@videojs/media/dom';
import { MediaTracksMixin } from '@videojs/media/media-tracks';
import type shaka from 'shaka-player/dist/shaka-player.compiled-es2021';
import { describe, expect, it } from 'vite-plus/test';

import { ShakaMediaTracksMixin } from '../media-tracks';

class FakeEngine extends EventTarget {
  videoTracks = [{ active: true, width: 1280, height: 720, codecs: 'avc1', bandwidth: 3_000_000, frameRate: 30 }];
  audioTracks = [{ active: true, primary: false, language: 'en', label: 'English', roles: [], channelsCount: 2 }];
  config = { abr: { enabled: true } };

  getVideoTracks() {
    return this.videoTracks;
  }

  getAudioTracks() {
    return this.audioTracks;
  }

  configure(config: { abr: { enabled: boolean } }) {
    this.config.abr.enabled = config.abr.enabled;
  }

  getConfiguration() {
    return this.config;
  }

  selectVideoTrack() {}
  selectAudioTrack() {}
}

class FakeHost extends HTMLVideoAdapter {
  engine: shaka.Player;

  constructor(engine: shaka.Player) {
    super();
    this.engine = engine;
  }
}

const ShakaMediaTracks = ShakaMediaTracksMixin(MediaTracksMixin(FakeHost));

describe('ShakaMediaTracksMixin', () => {
  it('refreshes frame rate and audio kind on reannouncement without clearing selection', async () => {
    const engine = new FakeEngine();
    // SAFETY: The fake implements the player methods and events used by this mixin, which does not need its nominal brand.
    const media = new ShakaMediaTracks(engine as unknown as shaka.Player);

    try {
      engine.dispatchEvent(new Event('trackschanged'));

      expect(media.videoRenditions[0]!.frameRate).toBe(30);
      expect(media.audioTracks[0]!.kind).toBe('alternative');

      media.videoRenditions[0]!.selected = true;
      await Promise.resolve();

      engine.videoTracks[0]!.frameRate = 60;
      engine.audioTracks[0]!.primary = true;
      engine.dispatchEvent(new Event('trackschanged'));
      engine.dispatchEvent(new Event('audiotrackschanged'));
      await Promise.resolve();

      expect.soft(media.videoRenditions[0]!.frameRate).toBe(60);
      expect.soft(media.audioTracks[0]!.kind).toBe('main');
      expect(media.videoRenditions[0]!.selected).toBe(true);
      expect(engine.config.abr.enabled).toBe(false);
      expect(media.audioTracks[0]!.enabled).toBe(true);
    } finally {
      media.destroy();
    }
  });
});
