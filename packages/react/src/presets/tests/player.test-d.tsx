import type {
  AudioPlayerStore,
  BackgroundPlayerStore,
  LiveAudioPlayerStore,
  LiveVideoPlayerStore,
  VideoPlayerStore,
} from '@videojs/core/dom';
import { assertType, describe, it } from 'vitest';
import { AudioPlayer, usePlayer as useAudioPlayer } from '../audio/player';
import { BackgroundVideoPlayer, usePlayer as useBackgroundVideoPlayer } from '../background/player';
import { LiveAudioPlayer, usePlayer as useLiveAudioPlayer } from '../live-audio/player';
import { LiveVideoPlayer, usePlayer as useLiveVideoPlayer } from '../live-video/player';
import { usePlayer as useVideoPlayer, VideoPlayer } from '../video/player';

describe('preset players', () => {
  it('exposes each preset player with its inferred configuration props', () => {
    <VideoPlayer contentTitle="Video title">Video</VideoPlayer>;
    <AudioPlayer contentTitle="Audio title">Audio</AudioPlayer>;
    <LiveVideoPlayer contentTitle="Live video title">Live video</LiveVideoPlayer>;
    <LiveAudioPlayer contentTitle="Live audio title">Live audio</LiveAudioPlayer>;
    <BackgroundVideoPlayer>Background video</BackgroundVideoPlayer>;

    // @ts-expect-error Background video does not include the metadata feature.
    <BackgroundVideoPlayer contentTitle="Background title">Background video</BackgroundVideoPlayer>;

    // @ts-expect-error Preset players are components, not createPlayer result objects.
    VideoPlayer.Provider;
  });

  it('exposes a typed usePlayer hook for each preset', () => {
    function Consumers() {
      assertType<VideoPlayerStore>(useVideoPlayer());
      assertType<AudioPlayerStore>(useAudioPlayer());
      assertType<BackgroundPlayerStore>(useBackgroundVideoPlayer());
      assertType<LiveVideoPlayerStore>(useLiveVideoPlayer());
      assertType<LiveAudioPlayerStore>(useLiveAudioPlayer());
      return null;
    }

    void Consumers;
  });
});
