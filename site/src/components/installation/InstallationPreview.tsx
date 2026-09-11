import { useStore } from '@nanostores/react';
import { Container } from '@videojs/react';
import { Audio, AudioPlayer, AudioSkin, MinimalAudioSkin } from '@videojs/react/audio';
import { BackgroundVideo, BackgroundVideoPlayer, BackgroundVideoSkin } from '@videojs/react/background';
import { LiveAudioPlayer, LiveAudioSkin, MinimalLiveAudioSkin } from '@videojs/react/live-audio';
import { LiveVideoPlayer, LiveVideoSkin, MinimalLiveVideoSkin } from '@videojs/react/live-video';
import { HlsAudio } from '@videojs/react/media/hls-audio';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { MinimalVideoSkin, Video, VideoPlayer, VideoSkin } from '@videojs/react/video';
import type { ReactNode } from 'react';

import ArrowRight from '@/assets/icons/arrow-right.svg?react';
import {
  VJS10_DEMO_BACKGROUND_VIDEO_MP4,
  VJS10_DEMO_BACKGROUND_VIDEO_POSTER,
  VJS10_DEMO_LIVE,
  VJS10_DEMO_VIDEO,
} from '@/consts';
import { renderer, skin, sourceUrl, useCase } from '@/stores/installation';
import { currentFramework } from '@/stores/preferences';
import { getInstallationPreset, type Renderer, type Skin, type UseCase } from '@/utils/installation/types';
import useIsHydrated from '@/utils/useIsHydrated';

import '@videojs/react/video/skin.css';
import '@videojs/react/video/minimal-skin.css';
import '@videojs/react/audio/skin.css';
import '@videojs/react/audio/minimal-skin.css';
import '@videojs/react/live-video/skin.css';
import '@videojs/react/live-video/minimal-skin.css';
import '@videojs/react/live-audio/skin.css';
import '@videojs/react/live-audio/minimal-skin.css';
import '@videojs/react/background/skin.css';

// SAFETY: custom properties are valid inline style keys; React's type only lists standard properties.
const playerStyle = { '--media-border-radius': 'calc(var(--spacing) * 4)' } as React.CSSProperties;

const FILE_RENDERERS: Renderer[] = ['html5-video', 'html5-audio'];
const HLS_RENDERERS: Renderer[] = ['hls', 'mux-video', 'mux-audio'];

const SKIN_PAGES = {
  'default-video': { video: 'video-skin', 'minimal-video': 'video-minimal-skin' },
  'default-audio': { audio: 'audio-skin', 'minimal-audio': 'audio-minimal-skin' },
  'live-video': { video: 'live-video-skin', 'minimal-video': 'live-video-minimal-skin' },
  'live-audio': { audio: 'live-audio-skin', 'minimal-audio': 'live-audio-minimal-skin' },
  'background-video': { video: 'background-video-skin' },
} satisfies Record<UseCase, Partial<Record<Skin, string>>>;

interface Source {
  url: string;
  kind: 'file' | 'hls';
  demo: boolean;
}

/**
 * The preview follows the media source step: a pasted file or HLS URL (including a Mux upload) plays here, while embeds
 * such as YouTube or Vimeo keep the demo media since each needs its own adapter.
 */
function resolveSource($useCase: UseCase, $renderer: Renderer, $sourceUrl: string): Source {
  const preset = getInstallationPreset($useCase);
  const url = $sourceUrl.trim();
  if (url && FILE_RENDERERS.includes($renderer)) return { url, kind: 'file', demo: false };

  if (url && HLS_RENDERERS.includes($renderer)) return { url, kind: 'hls', demo: false };

  if (preset.live) return { url: VJS10_DEMO_LIVE.hls, kind: 'hls', demo: true };

  if ($useCase === 'background-video') return { url: VJS10_DEMO_BACKGROUND_VIDEO_MP4, kind: 'file', demo: true };

  return { url: VJS10_DEMO_VIDEO.mp4, kind: 'file', demo: true };
}

function VideoPreview({ skin: $skin, source, live }: { skin: Skin; source: Source; live: boolean }) {
  const poster = source.demo ? VJS10_DEMO_VIDEO.poster : undefined;
  const media =
    source.kind === 'hls' ? (
      <HlsJsVideo key={source.url} src={source.url} playsInline crossOrigin="anonymous" controls={$skin === 'none'} />
    ) : (
      <Video
        key={source.url}
        src={source.url}
        preload="metadata"
        playsInline
        crossOrigin="anonymous"
        controls={$skin === 'none'}
      />
    );
  const Player = live ? LiveVideoPlayer : VideoPlayer;
  const FullSkin = live ? LiveVideoSkin : VideoSkin;
  const MinimalSkin = live ? MinimalLiveVideoSkin : MinimalVideoSkin;

  return (
    <Player poster={poster}>
      {$skin === 'none' ? (
        <Container className="bg-faded-black aspect-video w-full overflow-hidden rounded-2xl [&_video]:size-full">
          {media}
        </Container>
      ) : $skin.startsWith('minimal') ? (
        <MinimalSkin className="aspect-video w-full" style={playerStyle}>
          {media}
        </MinimalSkin>
      ) : (
        <FullSkin className="aspect-video w-full" style={playerStyle}>
          {media}
        </FullSkin>
      )}
    </Player>
  );
}

function AudioPreview({ skin: $skin, source, live }: { skin: Skin; source: Source; live: boolean }) {
  const media =
    source.kind === 'hls' ? (
      <HlsAudio key={source.url} src={source.url} crossOrigin="anonymous" controls={$skin === 'none'} />
    ) : (
      <Audio key={source.url} src={source.url} preload="metadata" crossOrigin="anonymous" controls={$skin === 'none'} />
    );
  const Player = live ? LiveAudioPlayer : AudioPlayer;
  const FullSkin = live ? LiveAudioSkin : AudioSkin;
  const MinimalSkin = live ? MinimalLiveAudioSkin : MinimalAudioSkin;

  return (
    <div className="flex aspect-video w-full items-center justify-center">
      <Player>
        {$skin === 'none' ? (
          <Container className="w-full max-w-md [&_audio]:w-full">{media}</Container>
        ) : $skin.startsWith('minimal') ? (
          <MinimalSkin className="w-full max-w-md" style={playerStyle}>
            {media}
          </MinimalSkin>
        ) : (
          <FullSkin className="w-full max-w-md" style={playerStyle}>
            {media}
          </FullSkin>
        )}
      </Player>
    </div>
  );
}

function BackgroundPreview({ source }: { source: Source }) {
  return (
    <BackgroundVideoPlayer>
      <BackgroundVideoSkin className="aspect-video w-full overflow-hidden rounded-2xl" style={playerStyle}>
        <BackgroundVideo
          key={source.url}
          src={source.url}
          poster={source.demo ? VJS10_DEMO_BACKGROUND_VIDEO_POSTER : undefined}
          preload="metadata"
        />
      </BackgroundVideoSkin>
    </BackgroundVideoPlayer>
  );
}

/**
 * Live preview of the player the guide is about to generate: the chosen preset and skin, playing the chosen source. It
 * answers "what does this skin look like?" without leaving the page.
 */
export default function InstallationPreview() {
  const $useCase = useStore(useCase);
  const $skin = useStore(skin);
  const $renderer = useStore(renderer);
  const $sourceUrl = useStore(sourceUrl);
  const framework = useStore(currentFramework);
  const isHydrated = useIsHydrated();

  const preset = getInstallationPreset($useCase);
  const source = resolveSource($useCase, $renderer, $sourceUrl);
  const isBackground = $useCase === 'background-video';
  const effectiveSkin: Skin = isBackground ? 'video' : $skin;

  let player: ReactNode;

  if (isBackground) player = <BackgroundPreview source={source} />;
  else if (preset.mediaType === 'audio')
    player = <AudioPreview skin={effectiveSkin} source={source} live={preset.live} />;
  else player = <VideoPreview skin={effectiveSkin} source={source} live={preset.live} />;

  // SAFETY: SKIN_PAGES lists every preset; a skin missing from a preset (such as "none") simply has no reference page.
  const skinPage = (SKIN_PAGES[$useCase] as Partial<Record<Skin, string>>)[effectiveSkin];
  const skinLabel =
    effectiveSkin === 'none'
      ? 'no skin'
      : effectiveSkin.startsWith('minimal')
        ? 'the minimal skin'
        : 'the default skin';
  const referenceHref = skinPage
    ? `/docs/framework/${isHydrated && framework ? framework : 'react'}/components/${skinPage}`
    : null;

  return (
    <figure className="flex flex-col gap-3">
      {/* The player sits inside a padded surface so it reads as a preview of a component, not as page content. */}
      <div className="corner-squircle border-line bg-surface overflow-hidden rounded-lg border p-5 sm:p-8">
        {player}
      </div>
      <figcaption className="text-muted text-p3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span>
          {preset.label} preset with {skinLabel}
          {source.demo ? ', playing our demo media.' : ', playing your source.'}
          {effectiveSkin === 'none' && ' Native controls stand in for the UI you will build.'}
        </span>
        {referenceHref && (
          <a
            href={referenceHref}
            className="text-faded-black intent:text-accent dark:text-manila-light inline-flex items-center gap-1 font-semibold"
          >
            Skin reference
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        )}
      </figcaption>
    </figure>
  );
}
