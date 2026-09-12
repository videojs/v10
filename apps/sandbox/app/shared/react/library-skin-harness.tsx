// Shared harness for the component-library skin templates (`react-*-skin`): media, source, and captions pickers that
// mirror the shell's, the media component for a media id, and the default skin's hotkeys and gestures. Each template
// supplies only its controls; everything that makes the demo comparable across libraries lives here.

import { MEDIA, type MediaId, mediaSources } from '@app/media';
import { applyCaptionTracks, CAPTIONS_MODES, type CaptionsMode } from '@app/shared/captions';
import { SANDBOX_LOCALE_OPTION_GROUPS, SANDBOX_LOCALE_TAGS, type SandboxLocaleTag } from '@app/shared/i18n/locale-meta';
import { findMediaElement } from '@app/shared/media-element';
import {
  DEFAULT_SOURCE,
  getChapters,
  getPosterSrc,
  getStoryboardSrc,
  isLiveSource,
  SOURCES,
  type SourceId,
} from '@app/shared/sources';
import { SelectField } from '@app/shell/select';
import { Gesture, Hotkey } from '@videojs/react';
import { Video } from '@videojs/react/video';
import { lazy, type ReactNode, Suspense, useEffect, useRef, useState } from 'react';

import { Chapters } from './chapters';
import { Storyboard } from './storyboard';
import { useLocale } from './use-locale';
import { useSandbox } from './use-sandbox';

// Engines load on selection, so the page pays only for the one it plays.
const DashVideo = lazy(() => import('@videojs/react/media/dash-video').then((m) => ({ default: m.DashVideo })));
const HlsVideo = lazy(() => import('@videojs/react/media/hls-video').then((m) => ({ default: m.HlsVideo })));
const HlsJsVideo = lazy(() => import('@videojs/react/media/hlsjs-video').then((m) => ({ default: m.HlsJsVideo })));
const MuxVideo = lazy(() => import('@videojs/react/media/mux-video').then((m) => ({ default: m.MuxVideo })));
const NativeHlsVideo = lazy(() =>
  import('@videojs/react/media/native-hls-video').then((m) => ({ default: m.NativeHlsVideo }))
);
const ShakaVideo = lazy(() => import('@videojs/react/media/shaka-video').then((m) => ({ default: m.ShakaVideo })));

/** Video medias with a React component and an on-demand source list; live sources need the live player and are left out. */
export const LIBRARY_MEDIA_IDS = [
  'video',
  'hls-video',
  'hlsjs-video',
  'native-hls-video',
  'mux-video',
  'dash-video',
  'shaka-video',
] as const satisfies readonly MediaId[];

export type LibraryMediaId = (typeof LIBRARY_MEDIA_IDS)[number];

export function libraryMediaSources(media: LibraryMediaId): readonly SourceId[] {
  return mediaSources(media, 'react').filter((id) => !isLiveSource(id));
}

function isLibraryMediaId(value: string | null): value is LibraryMediaId {
  return value !== null && (LIBRARY_MEDIA_IDS as readonly string[]).includes(value);
}

function isSourceId(value: string | null): value is SourceId {
  return value !== null && Object.hasOwn(SOURCES, value);
}

function isCaptionsMode(value: string | null): value is CaptionsMode {
  return value !== null && (CAPTIONS_MODES as readonly string[]).includes(value);
}

/** Where a media lands: the requested source if it plays there, else the shell's entry/fallback for that media. */
function firstSourceFor(media: LibraryMediaId, preferred: SourceId | null): SourceId {
  const sources = libraryMediaSources(media);
  const { entrySource, fallbackSource } = MEDIA[media];

  if (preferred && sources.includes(preferred)) return preferred;

  for (const candidate of [entrySource, fallbackSource, DEFAULT_SOURCE]) {
    if (candidate && sources.includes(candidate)) return candidate;
  }

  return sources[0] ?? DEFAULT_SOURCE;
}

function writeParams(entries: Record<string, string>) {
  const url = new URL(window.location.href);

  for (const [key, value] of Object.entries(entries)) url.searchParams.set(key, value);

  window.history.replaceState(null, '', url);
}

export interface LibrarySkinSelection {
  media: LibraryMediaId;
  source: SourceId;
  captions: CaptionsMode;
  setMedia: (media: LibraryMediaId) => void;
  setSource: (source: SourceId) => void;
  setCaptions: (captions: CaptionsMode) => void;
}

/** The page's media, source, and captions, read from and written to the URL like the shell's own params. */
export function useLibrarySkinSelection(): LibrarySkinSelection {
  const [state, setState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    // hls.js is the broadest demo: TS and fMP4 HLS, renditions, and audio tracks.
    const media = isLibraryMediaId(params.get('media')) ? params.get('media') : 'hlsjs-video';
    const requested = params.get('source');
    const captions = params.get('captions');

    return {
      media: media as LibraryMediaId,
      source: firstSourceFor(media as LibraryMediaId, isSourceId(requested) ? requested : null),
      captions: isCaptionsMode(captions) ? captions : ('none' as CaptionsMode),
    };
  });

  const setMedia = (media: LibraryMediaId) => {
    const source = firstSourceFor(media, state.source);

    writeParams({ media, source });
    setState((current) => ({ ...current, media, source }));
  };

  const setSource = (source: SourceId) => {
    writeParams({ source });
    // The shell streams this to preview pages; posting it keeps `useSandbox()` consumers on the same source.
    window.postMessage({ type: 'source-change', source }, '*');
    setState((current) => ({ ...current, source }));
  };

  const setCaptions = (captions: CaptionsMode) => {
    writeParams({ captions });
    setState((current) => ({ ...current, captions }));
  };

  return { ...state, setMedia, setSource, setCaptions };
}

const CAPTIONS_LABELS: Record<CaptionsMode, string> = { none: 'None', single: 'One track', multiple: 'Two tracks' };

export interface HarnessToolbarProps {
  selection: LibrarySkinSelection;
  /** The template's own selector, rendered first. */
  children?: ReactNode;
}

function isLocaleTag(value: string): value is SandboxLocaleTag {
  // SAFETY: widening to `string[]` only relaxes the `includes` parameter; the predicate is decided by the membership test.
  return (SANDBOX_LOCALE_TAGS as readonly string[]).includes(value);
}

/** Shell-style selects for media, source, captions, and language, plus whatever the template adds (its approach picker). */
export function HarnessToolbar({ selection, children }: HarnessToolbarProps) {
  const { media, source, captions, setMedia, setSource, setCaptions } = selection;
  const locale = useLocale();

  const setLocale = (next: SandboxLocaleTag) => {
    writeParams({ locale: next });
    // The same message the shell streams; `SandboxI18nProvider` picks it up through `useLocale()`.
    window.postMessage({ type: 'locale-change', locale: next }, '*');
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
      {children}
      <SelectField
        label="Media"
        value={media}
        onChange={(value) => {
          if (isLibraryMediaId(value)) setMedia(value);
        }}
        options={LIBRARY_MEDIA_IDS.map((id) => ({ value: id, label: MEDIA[id].label }))}
      />
      <SelectField
        label="Source"
        value={source}
        onChange={(value) => {
          if (isSourceId(value)) setSource(value);
        }}
        options={libraryMediaSources(media).map((id) => ({ value: id, label: SOURCES[id].label }))}
      />
      <SelectField
        label="Captions"
        value={captions}
        onChange={(value) => {
          if (isCaptionsMode(value)) setCaptions(value);
        }}
        options={CAPTIONS_MODES.map((mode) => ({ value: mode, label: CAPTIONS_LABELS[mode] }))}
      />
      <SelectField
        label="Language"
        value={locale}
        onChange={(value) => {
          if (isLocaleTag(value)) setLocale(value);
        }}
        optionGroups={SANDBOX_LOCALE_OPTION_GROUPS}
      />
    </div>
  );
}

export interface SelectedMediaProps {
  selection: Pick<LibrarySkinSelection, 'media' | 'source' | 'captions'>;
  className?: string;
}

/**
 * The React media component for the selected media, fed the selected source the way the shell templates do, with
 * chapter and storyboard tracks where the source has them and the sandbox's synthetic caption tracks applied.
 */
export function SelectedMedia({ selection, className = 'block size-full' }: SelectedMediaProps) {
  const { media, source, captions } = selection;
  const { mediaProps } = useSandbox();
  const scopeRef = useRef<HTMLDivElement>(null);
  const { url, source: engineSource } = SOURCES[source];

  useEffect(() => {
    const element = scopeRef.current ? findMediaElement(scopeRef.current) : undefined;

    if (element) applyCaptionTracks(element, captions);
  }, [media, source, captions]);

  const common = { ...mediaProps, className, playsInline: true, crossOrigin: '' as const };
  const chapters = <Chapters tracks={getChapters(source)} />;
  const storyboard = <Storyboard src={getStoryboardSrc(source)} />;
  // Engines that take a structured `source` (DRM, tokens) get it; the rest take the URL.
  const engineProps = engineSource ? { source: engineSource } : { src: url ?? '' };

  let element: ReactNode;

  switch (media) {
    case 'video':
      element = (
        <Video src={url ?? ''} {...common}>
          {chapters}
          {storyboard}
        </Video>
      );
      break;
    case 'hls-video':
      element = (
        <HlsVideo src={url ?? ''} {...common}>
          {chapters}
          {storyboard}
        </HlsVideo>
      );
      break;
    case 'hlsjs-video':
      element = (
        <HlsJsVideo {...engineProps} {...common}>
          {chapters}
          {storyboard}
        </HlsJsVideo>
      );
      break;
    case 'native-hls-video':
      element = (
        <NativeHlsVideo {...engineProps} {...common}>
          {chapters}
          {storyboard}
        </NativeHlsVideo>
      );
      break;
    case 'mux-video':
      // The storyboard track is derived from the Mux source.
      element = (
        <MuxVideo {...engineProps} {...common}>
          {chapters}
        </MuxVideo>
      );
      break;
    case 'dash-video':
      element = <DashVideo src={url ?? ''} {...common} />;
      break;
    case 'shaka-video':
      element = <ShakaVideo src={url ?? ''} {...common} />;
      break;
  }

  return (
    // `display: contents` keeps the media a layout child of the player container.
    <div ref={scopeRef} className="contents" key={`${media}:${source}`}>
      <Suspense fallback={null}>{element}</Suspense>
    </div>
  );
}

export function selectedPoster(source: SourceId): string | undefined {
  return getPosterSrc(source);
}

/** The default video skin's hotkeys and gestures. Both render nothing; they bind to the player container. */
export function PlayerBehaviors() {
  return (
    <>
      <Hotkey keys="Space" action="togglePaused" />
      <Hotkey keys="k" action="togglePaused" />
      <Hotkey keys="m" action="toggleMuted" />
      <Hotkey keys="ArrowRight" action="seekStep" />
      <Hotkey keys="ArrowLeft" action="seekStep" />
      <Hotkey keys="l" action="seekStep" />
      <Hotkey keys="j" action="seekStep" />
      <Hotkey keys="ArrowUp" action="volumeStep" />
      <Hotkey keys="ArrowDown" action="volumeStep" />
      <Hotkey keys="0-9" action="seekToPercent" />
      <Hotkey keys="Home" action="seekToPercent" value={0} />
      <Hotkey keys="End" action="seekToPercent" value={100} />
      <Hotkey keys=">" action="speedUp" />
      <Hotkey keys="<" action="speedDown" />
      <Hotkey keys="f" action="toggleFullscreen" />
      <Hotkey keys="c" action="toggleSubtitles" />
      <Hotkey keys="i" action="togglePictureInPicture" />
      <Gesture type="tap" action="togglePaused" pointer="mouse" region="center" />
      <Gesture type="tap" action="toggleControls" pointer="touch" />
      <Gesture type="doubletap" action="seekStep" region="left" />
      <Gesture type="doubletap" action="toggleFullscreen" region="center" />
      <Gesture type="doubletap" action="seekStep" region="right" />
    </>
  );
}

/** The packaged skins' frame: 16:9, capped at the shell's width variable, clipped corners. */
export function PlayerFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto aspect-video w-full max-w-[var(--sandbox-player-width,56rem)] overflow-clip rounded-2xl bg-black text-white">
      {children}
    </div>
  );
}
