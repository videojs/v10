import { Input } from '@base-ui/react/input';
import { useStore } from '@nanostores/react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import Image from '@/assets/icons/image.svg?react';
import LinkSquare from '@/assets/icons/link-square.svg?react';
import CloudflareLogo from '@/assets/logos/brands/cloudflare.svg?react';
import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import SpotifyLogo from '@/assets/logos/brands/spotify.svg?react';
import TiktokLogo from '@/assets/logos/brands/tiktok.svg?react';
import TwitchLogo from '@/assets/logos/brands/twitch.svg?react';
import VimeoLogo from '@/assets/logos/brands/vimeo.svg?react';
import YoutubeLogo from '@/assets/logos/brands/youtube.svg?react';
import MuxLogo from '@/assets/logos/mux-small.svg?react';
import CardRadioGroup from '@/components/CardRadioGroup';
import { renderer, sourceUrl, useCase } from '@/stores/installation';
import { articleFor, detectRenderer } from '@/utils/installation/detect-renderer';
import { RENDERER_LABELS } from '@/utils/installation/renderer-options';
import { getInstallationPreset, type Renderer } from '@/utils/installation/types';

import MuxUploaderPanel from './MuxUploaderPanel';

/** Protocols without a brand mark get a monogram so every card still has a recognizable badge. */
function Monogram({ children }: { children: string }) {
  return <span className="font-display-compact text-p4 font-bold tracking-tight uppercase">{children}</span>;
}

const RENDERER_MEDIA: Record<Renderer, ReactNode> = {
  'html5-video': <Html5Logo className="size-6" />,
  'html5-audio': <Html5Logo className="size-6" />,
  hls: <Monogram>HLS</Monogram>,
  dash: <Monogram>DASH</Monogram>,
  'mux-video': <MuxLogo className="w-7" />,
  'mux-audio': <MuxLogo className="w-7" />,
  vimeo: <VimeoLogo className="size-6" />,
  youtube: <YoutubeLogo className="size-6" />,
  cloudflare: <CloudflareLogo className="size-6" />,
  tiktok: <TiktokLogo className="size-6" />,
  twitch: <TwitchLogo className="size-6" />,
  spotify: <SpotifyLogo className="size-6" />,
  'background-video': <Image className="size-6" />,
};

const RENDERER_DESCRIPTIONS: Record<Renderer, string> = {
  'html5-video': 'MP4, WebM, and other file URLs',
  'html5-audio': 'MP3, AAC, and other file URLs',
  hls: 'Adaptive .m3u8 streams via hls.js',
  dash: 'Adaptive .mpd streams via dash.js',
  'mux-video': 'Playback IDs with Mux Data built in',
  'mux-audio': 'Playback IDs with Mux Data built in',
  vimeo: 'Vimeo videos and private links',
  youtube: 'YouTube videos and shorts',
  cloudflare: 'Cloudflare Stream videos',
  tiktok: 'TikTok videos',
  twitch: 'Twitch channels, videos, and clips',
  spotify: 'Spotify tracks, albums, and episodes',
  'background-video': 'Muted, looping file URLs',
};

export default function MediaSourcePicker() {
  const $renderer = useStore(renderer);
  const $useCase = useStore(useCase);
  const $sourceUrl = useStore(sourceUrl);

  const renderers = getInstallationPreset($useCase).renderers;
  const detection = detectRenderer($sourceUrl, $useCase);
  const detectedRenderer = detection?.renderer ?? null;

  // Auto-select renderer when the detected renderer or use case changes.
  // Uses the primitive `detectedRenderer` string instead of the `detection`
  // object to avoid re-firing on every render (new object reference each time),
  // which would override manual selection.
  useEffect(() => {
    if (detectedRenderer) {
      renderer.set(detectedRenderer);
    } else {
      // No valid detection — ensure current renderer is valid for use case
      const current = renderer.get();
      const validRenderers = getInstallationPreset($useCase).renderers;

      if (!validRenderers.includes(current)) {
        renderer.set(validRenderers[0]!);
      }
    }
  }, [detectedRenderer, $useCase]);

  const hasUrl = $sourceUrl.trim().length > 0;
  const showDetectionMatch = hasUrl && detection && detection.renderer === $renderer;
  const showDetectionSuggestion = hasUrl && detection && detection.renderer !== $renderer;
  const showNoMatch = hasUrl && !detection;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label htmlFor="source-url-input" className="text-p3 font-semibold">
          Paste a media URL to detect its source type
        </label>
        <div className="relative">
          <LinkSquare
            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="source-url-input"
            type="url"
            value={$sourceUrl}
            onChange={(e) => sourceUrl.set(e.target.value)}
            placeholder="https://stream.mux.com/….m3u8"
            className="border-line bg-surface text-p3 placeholder:text-muted intent:border-line-strong focus-visible:border-line-strong focus-visible:outline-gold h-10 w-full rounded-xs border pr-3 pl-9 focus-visible:outline-2 focus-visible:outline-offset-1"
          />
        </div>
        <p className="text-muted text-p4" aria-live="polite">
          {showDetectionMatch ? (
            <>
              This looks like {articleFor(detection.renderer)}{' '}
              <strong className="font-semibold">{detection.label}</strong> link, selected below.
            </>
          ) : showDetectionSuggestion ? (
            <>
              This looks like {articleFor(detection.renderer)} {detection.label} link.{' '}
              <button
                type="button"
                onClick={() => renderer.set(detection.renderer)}
                className="intent:decoration-gold cursor-pointer underline"
              >
                Select {detection.label}
              </button>
            </>
          ) : showNoMatch ? (
            "We couldn't detect the source type. Pick one below."
          ) : (
            'Optional. The URL also ends up in your generated code.'
          )}
        </p>
      </div>

      <CardRadioGroup
        value={$renderer}
        onChange={(value) => renderer.set(value)}
        options={renderers.map((value) => ({
          value,
          label: RENDERER_LABELS[value],
          description: RENDERER_DESCRIPTIONS[value],
          media: RENDERER_MEDIA[value],
        }))}
        aria-label="Select media source type"
        layout="row"
        minColumnWidth="14rem"
      />

      <div className="flex items-center gap-4" aria-hidden="true">
        <span className="bg-line h-px flex-1" />
        <span className="text-muted text-p4 tracking-wide uppercase select-none">or</span>
        <span className="bg-line h-px flex-1" />
      </div>

      <MuxUploaderPanel />
    </div>
  );
}
