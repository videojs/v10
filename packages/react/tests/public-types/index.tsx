/**
 * Strict consumer of the emitted `@videojs/react` declarations.
 *
 * Resolves the package through its own `exports` map, so every import below lands on `dist/dev/**.d.ts` rather than
 * source. `skipLibCheck: false` makes the compiler check those declaration files themselves, which is what a strict
 * downstream project sees and what the source typecheck cannot observe.
 */
import type { PlayerStore, UIComponentProps, VideoPlayerStore } from '@videojs/react';
import {
  Container,
  createPlayer,
  Menu,
  mergeProps,
  PlayButton,
  type PlayButtonProps,
  Poster,
  selectPlayback,
  Slider,
  StatusAnnouncer,
  Time,
  TimeSlider,
  Tooltip,
  usePlayer,
  useStore,
  videoFeatures,
} from '@videojs/react';
import { AudioPlayer, AudioSkin, usePlayer as useAudioPlayer } from '@videojs/react/audio';
import { BackgroundVideoPlayer, usePlayer as useBackgroundPlayer } from '@videojs/react/background';
import { GoogleCast } from '@videojs/react/extensions/google-cast';
import { MuxData, type MuxDataProps } from '@videojs/react/extensions/mux-data';
import { createI18n, I18nProvider, type Locale, useTranslator } from '@videojs/react/i18n';
import '@videojs/react/i18n/locales/en/register';
import { type IconProps, PlayIcon } from '@videojs/react/icons';
import { PlayIcon as MinimalPlayIcon } from '@videojs/react/icons/minimal';
import { LiveAudioPlayer, usePlayer as useLiveAudioPlayer } from '@videojs/react/live-audio';
import { LiveVideoPlayer, LiveVideoSkin, usePlayer as useLiveVideoPlayer } from '@videojs/react/live-video';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { MuxAudio } from '@videojs/react/media/mux-audio/hls-js';
import { MuxAudio as SpfMuxAudio } from '@videojs/react/media/mux-audio/spf';
import { MuxVideo } from '@videojs/react/media/mux-video/hls-js';
import { MuxVideo as SpfMuxVideo } from '@videojs/react/media/mux-video/spf';
import {
  MinimalVideoSkin,
  usePlayer as useVideoPlayer,
  Video,
  VideoPlayer,
  VideoSkin,
  type VideoSkinProps,
} from '@videojs/react/video';
import type { ComponentProps, ReactNode } from 'react';

type Extends<A, B extends A> = B;

// createPlayer returns the provider plus hooks typed by the selected features.
const { Player, usePlayer: useBoundPlayer, useMedia } = createPlayer({ features: videoFeatures });

function BoundConsumer(): ReactNode {
  const store: VideoPlayerStore = useBoundPlayer();
  const paused: boolean = useBoundPlayer((state) => state.paused);
  const media = useMedia();

  return <span data-paused={paused} data-media={media !== null} data-store={store.destroyed} />;
}

// Root hooks stay generic; selectors and store bindings resolve through the barrel.
function GenericConsumer(): ReactNode {
  const store = usePlayer();
  const paused = usePlayer((state) => selectPlayback(state)?.paused ?? true);
  const playback = useStore(store, selectPlayback);
  const translate = useTranslator();

  return <span data-paused={paused} data-from-store={playback?.paused} title={translate('Play')} />;
}

// Component props types are usable both as annotations and through the namespace shorthand.
const playButtonProps: PlayButtonProps = {
  className: (state) => (state.paused ? 'paused' : 'playing'),
  render: (props, state) => <button {...props} data-paused={state.paused} />,
};
const posterProps: Poster.Props = { render: (props) => <img {...props} alt="" /> };
const iconProps: IconProps = { width: 24 };
const merged: ComponentProps<'button'> = mergeProps({ className: 'a' }, { className: 'b' });

function Preset(): ReactNode {
  const skinProps: VideoSkinProps = { renderPoster: posterProps.render };

  return (
    <I18nProvider>
      <VideoPlayer title="Title">
        <VideoSkin {...skinProps}>
          <Video src="video.mp4" />
          <GoogleCast />
        </VideoSkin>
        <MinimalVideoSkin>
          <HlsVideo src="stream.m3u8" />
        </MinimalVideoSkin>
      </VideoPlayer>
      <AudioPlayer>
        <AudioSkin />
      </AudioPlayer>
      <LiveVideoPlayer>
        <LiveVideoSkin />
      </LiveVideoPlayer>
      <LiveAudioPlayer>{null}</LiveAudioPlayer>
      <BackgroundVideoPlayer>{null}</BackgroundVideoPlayer>
    </I18nProvider>
  );
}

// The Mux entries resolve without `mux-embed`'s own types, which that package does not publish.
function MuxPreset(): ReactNode {
  const metadata: MuxDataProps['metadata'] = { video_title: 'Title', view_session_id: 'session' };

  return (
    <VideoPlayer>
      <MuxVideo source={{ playbackId: 'abc123' }} />
      <MuxAudio src="https://stream.mux.com/abc123.m3u8" />
      <SpfMuxVideo source={{ playbackId: 'abc123' }} />
      <SpfMuxAudio src="https://stream.mux.com/abc123.m3u8" />
      <MuxData playerSoftwareName="mux-video" metadata={metadata} MuxDataSdk={undefined} />
    </VideoPlayer>
  );
}

// Every preset hook must resolve its store through the public feature types, not a synthesized barrel namespace.
function PresetHooks(): ReactNode {
  const liveEdgeStart: number = useLiveVideoPlayer((state) => state.liveEdgeStart);
  const liveAudioEdgeStart: number = useLiveAudioPlayer((state) => state.liveEdgeStart);
  // The background preset selects no features yet, so its store carries no feature state.
  const background: PlayerStore<[]> = useBackgroundPlayer();

  return <span data-live={liveEdgeStart} data-live-audio={liveAudioEdgeStart} data-background={background.destroyed} />;
}

function Composed(): ReactNode {
  return (
    <Player>
      <Container>
        <PlayButton {...playButtonProps}>
          <PlayIcon {...iconProps} />
          <MinimalPlayIcon />
        </PlayButton>
        <Tooltip.Root>
          <Tooltip.Trigger />
          <Tooltip.Popup>
            <Tooltip.Label>Play</Tooltip.Label>
          </Tooltip.Popup>
        </Tooltip.Root>
        <TimeSlider.Root>
          <TimeSlider.Track>
            <TimeSlider.Fill />
          </TimeSlider.Track>
        </TimeSlider.Root>
        <Slider.Root>
          <Slider.Thumb />
        </Slider.Root>
        <Time.Group>
          <Time.Value type="current" />
        </Time.Group>
        <Menu.Root>
          <Menu.Trigger />
        </Menu.Root>
        <StatusAnnouncer closeDelay={500} />
      </Container>
    </Player>
  );
}

// Relationships the declarations must preserve; a broken constraint is a compile error.
export type PublicTypeAssertions = [
  Extends<PlayerStore, VideoPlayerStore>,
  Extends<UIComponentProps<'button', PlayButton.State>, PlayButtonProps>,
  Extends<ReturnType<typeof useVideoPlayer>, ReturnType<typeof useBoundPlayer>>,
  Extends<ReturnType<typeof useAudioPlayer>, PlayerStore>,
];

const locale: Locale = 'en';
const i18n = createI18n();

void [BoundConsumer, GenericConsumer, Preset, MuxPreset, PresetHooks, Composed, merged, locale, i18n];
