import { PLATFORMS, PRESETS, STYLINGS } from '@app/constants';
import { DEFAULT_SANDBOX_LOCALE, SANDBOX_LOCALE_TAGS, type SandboxLocaleTag } from '@app/shared/i18n/locale-meta';
import { DEFAULT_PRELOAD, PRELOAD_VALUES, type PreloadValue } from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import {
  DASH_SOURCE_IDS,
  DEFAULT_AUDIO_SOURCE,
  DEFAULT_DASH_SOURCE,
  DEFAULT_SOURCE,
  HLS_SOURCE_IDS,
  isDrmSource,
  isMuxSource,
  MP4_SOURCE_IDS,
  MUX_SOURCE_IDS,
  MUX_SPF_SOURCE_IDS,
  NON_DASH_SOURCE_IDS,
  SOURCES,
  SPF_HLS_SOURCE_IDS,
} from '@app/shared/sources';
import type { Platform, Preset, Styling } from '@app/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from './navbar';
import { Preview } from './preview';

function getPagePath(platform: Platform, preset: Preset): string {
  if (platform === 'cdn') return '/cdn/';
  if (preset === 'background-video') return `/${platform}-background-video/`;
  if (preset === 'vimeo-video') return `/${platform}-vimeo-video/`;
  if (preset === 'youtube-video') return `/${platform}-youtube-video/`;
  return `/${platform}-${preset}/`;
}

function readParams() {
  const params = new URLSearchParams(location.search);
  const preload = params.get('preload');
  return {
    platform: (params.get('platform') ?? 'html') as Platform,
    styling: (params.get('styling') ?? 'css') as Styling,
    preset: (params.get('preset') ?? 'video') as Preset,
    skin: (params.get('skin') ?? 'default') as 'default' | 'minimal',
    source: (params.get('source') ?? 'hls-1') as SourceId,
    autoplay: params.get('autoplay') === '1',
    muted: params.get('muted') === '1',
    loop: params.get('loop') === '1',
    preload: PRELOAD_VALUES.includes(preload as PreloadValue) ? (preload as PreloadValue) : DEFAULT_PRELOAD,
    accentColor: params.get('accent')?.trim() ?? '',
    locale: (() => {
      const value = params.get('locale');
      return SANDBOX_LOCALE_TAGS.includes(value as SandboxLocaleTag)
        ? (value as SandboxLocaleTag)
        : DEFAULT_SANDBOX_LOCALE;
    })(),
  };
}

export function App() {
  const initial = useMemo(readParams, []);
  const [platform, setPlatform] = useState<Platform>(initial.platform);
  const [styling, setStyling] = useState(initial.styling);
  const [preset, setPreset] = useState<Preset>(initial.preset);
  const [skin, setSkin] = useState(initial.skin);
  const [source, setSource] = useState(initial.source);
  const [autoplay, setAutoplay] = useState(initial.autoplay);
  const [muted, setMuted] = useState(initial.muted);
  const [loop, setLoop] = useState(initial.loop);
  const [preload, setPreload] = useState<PreloadValue>(initial.preload);
  const [accentColor, setAccentColor] = useState(initial.accentColor);
  const [locale, setLocale] = useState<SandboxLocaleTag>(initial.locale);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const pagePath = getPagePath(platform, preset);

  // `MuxVideo` is the only preset that turns a Mux DRM token into license URLs;
  // the HLS presets take license servers through `source.drm`, whichever path
  // they play. The CDN sandbox builds elements from attributes alone, so neither
  // reaches it.
  const structuredSource = platform !== 'cdn';
  const hlsPreset = preset === 'hlsjs-video' || preset === 'native-hls-video';
  const muxPreset = preset === 'mux-video' || preset === 'mux-audio';
  const muxSpfPreset = preset === 'mux-video-spf' || preset === 'mux-audio-spf';
  const spfHlsPreset = preset === 'hls-video' || preset === 'hls-audio';
  // Every background preset renders a fixed source and has no Tailwind skin.
  const backgroundPreset =
    preset === 'background-video' || preset === 'hls-background-video' || preset === 'mux-background-video';
  const availableSources =
    preset === 'audio'
      ? MP4_SOURCE_IDS
      : preset === 'dash-video'
        ? DASH_SOURCE_IDS
        : structuredSource && muxPreset
          ? MUX_SOURCE_IDS
          : structuredSource && hlsPreset
            ? HLS_SOURCE_IDS
            : structuredSource && muxSpfPreset
              ? MUX_SPF_SOURCE_IDS
              : spfHlsPreset || muxSpfPreset
                ? SPF_HLS_SOURCE_IDS
                : NON_DASH_SOURCE_IDS;

  // Keep the URL in sync with all state.
  useEffect(() => {
    const params = new URLSearchParams({
      platform,
      styling,
      preset,
      skin,
      source,
      autoplay: autoplay ? '1' : '0',
      muted: muted ? '1' : '0',
      loop: loop ? '1' : '0',
      preload,
      locale,
    });
    if (accentColor) params.set('accent', accentColor);
    history.replaceState(null, '', `/?${params}`);
  }, [platform, styling, preset, skin, source, autoplay, muted, loop, preload, accentColor, locale]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'skin-change', skin }, '*');
  }, [skin]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'source-change', source }, '*');
  }, [source]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'autoplay-change', autoplay }, '*');
  }, [autoplay]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'muted-change', muted }, '*');
  }, [muted]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'loop-change', loop }, '*');
  }, [loop]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'preload-change', preload }, '*');
  }, [preload]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'locale-change', locale }, '*');
  }, [locale]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'accent-color-change', accentColor }, '*');
  }, [accentColor]);

  // Constrain source to MP4 when switching to audio
  useEffect(() => {
    if (preset === 'audio' && SOURCES[source].type !== 'mp4') {
      setSource(DEFAULT_AUDIO_SOURCE);
    }
  }, [preset, source]);

  // Constrain source to DASH when switching to dash-video
  useEffect(() => {
    if (preset === 'dash-video' && SOURCES[source].type !== 'dash') {
      setSource(DEFAULT_DASH_SOURCE);
    }
  }, [preset, source]);

  // Constrain source away from DASH for non-DASH presets
  useEffect(() => {
    if (preset !== 'dash-video' && SOURCES[source].type === 'dash') {
      setSource(DEFAULT_SOURCE);
    }
  }, [preset, source]);

  // Constrain source away from DRM the preset cannot license, and away from a
  // playback ID a non-Mux preset has no URL for.
  useEffect(() => {
    if ((isDrmSource(source) || isMuxSource(source)) && !availableSources.includes(source)) {
      setSource(DEFAULT_SOURCE);
    }
  }, [availableSources, source]);

  // CDN, background video, and embed (Vimeo/YouTube) videos do not have a Tailwind skin variant.
  useEffect(() => {
    if (
      (platform === 'cdn' || backgroundPreset || preset === 'vimeo-video' || preset === 'youtube-video') &&
      styling === 'tailwind'
    ) {
      setStyling('css');
    }
  }, [platform, preset, backgroundPreset, styling]);

  const handleSourceChange = useCallback((value: string) => setSource(value as SourceId), []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar
        platform={platform}
        onPlatformChange={setPlatform}
        styling={styling}
        onStylingChange={setStyling}
        preset={preset}
        onPresetChange={setPreset}
        skin={skin}
        onSkinChange={setSkin}
        source={source}
        onSourceChange={handleSourceChange}
        autoplay={autoplay}
        onAutoplayChange={setAutoplay}
        muted={muted}
        onMutedChange={setMuted}
        loop={loop}
        onLoopChange={setLoop}
        preload={preload}
        onPreloadChange={setPreload}
        locale={locale}
        onLocaleChange={setLocale}
        accentColor={accentColor}
        onAccentColorChange={setAccentColor}
        availableSources={availableSources}
        isBackgroundVideo={backgroundPreset}
        isSpfHls={spfHlsPreset}
        isMuxVideo={preset === 'mux-video'}
        isMuxAudio={preset === 'mux-audio'}
        isVimeoVideo={preset === 'vimeo-video'}
        isYouTubeVideo={preset === 'youtube-video'}
        platforms={PLATFORMS}
        stylings={STYLINGS}
        presets={PRESETS}
        sources={SOURCES}
      />
      <Preview
        key={`${pagePath}:${preset}:${styling}`}
        ref={iframeRef}
        pagePath={pagePath}
        preset={preset}
        skin={skin}
        styling={styling}
        source={source}
        autoplay={autoplay}
        muted={muted}
        loop={loop}
        preload={preload}
        locale={locale}
        accentColor={accentColor}
        onLoad={() => {
          iframeRef.current?.contentWindow?.postMessage({ type: 'accent-color-change', accentColor }, '*');
        }}
      />
    </div>
  );
}
