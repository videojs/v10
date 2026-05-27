import { PLATFORMS, PRESETS, STYLINGS } from '@app/constants';
import { DEFAULT_PRELOAD, PRELOAD_VALUES, type PreloadValue } from '@app/shared/sandbox-listener';
import type { SourceId } from '@app/shared/sources';
import {
  DASH_SOURCE_IDS,
  DEFAULT_AUDIO_SOURCE,
  DEFAULT_DASH_SOURCE,
  DEFAULT_SIMPLE_HLS_SOURCE,
  DEFAULT_SOURCE,
  MP4_SOURCE_IDS,
  NON_DASH_SOURCE_IDS,
  SIMPLE_HLS_SOURCE_IDS,
  SOURCES,
} from '@app/shared/sources';
import type { Platform, Preset, Styling } from '@app/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from './navbar';
import { Preview } from './preview';

function getPagePath(platform: Platform, preset: Preset): string {
  if (platform === 'cdn') return '/cdn/';
  if (preset === 'background-video') return `/${platform}-background-video/`;
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const pagePath = getPagePath(platform, preset);

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
    });
    history.replaceState(null, '', `/?${params}`);
  }, [platform, styling, preset, skin, source, autoplay, muted, loop, preload]);

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

  // Constrain source to the new preset synchronously so the iframe URL
  // (captured once on mount) reflects the corrected source.
  const handlePresetChange = useCallback(
    (next: Preset) => {
      setPreset(next);
      const sourceType = SOURCES[source].type;
      if (next === 'audio' && sourceType !== 'mp4') setSource(DEFAULT_AUDIO_SOURCE);
      else if (next === 'dash-video' && sourceType !== 'dash') setSource(DEFAULT_DASH_SOURCE);
      else if (next === 'simple-hls-video' && !SIMPLE_HLS_SOURCE_IDS.includes(source))
        setSource(DEFAULT_SIMPLE_HLS_SOURCE);
      else if (next !== 'dash-video' && sourceType === 'dash') setSource(DEFAULT_SOURCE);
    },
    [source]
  );

  // CDN and background video do not have a Tailwind skin variant.
  useEffect(() => {
    if ((platform === 'cdn' || preset === 'background-video') && styling === 'tailwind') {
      setStyling('css');
    }
  }, [platform, preset, styling]);

  const availableSources =
    preset === 'audio'
      ? MP4_SOURCE_IDS
      : preset === 'dash-video'
        ? DASH_SOURCE_IDS
        : preset === 'simple-hls-video'
          ? SIMPLE_HLS_SOURCE_IDS
          : NON_DASH_SOURCE_IDS;

  const handleSourceChange = useCallback((value: string) => setSource(value as SourceId), [setSource]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar
        platform={platform}
        onPlatformChange={setPlatform}
        styling={styling}
        onStylingChange={setStyling}
        preset={preset}
        onPresetChange={handlePresetChange}
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
        availableSources={availableSources}
        isBackgroundVideo={preset === 'background-video'}
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
      />
    </div>
  );
}
