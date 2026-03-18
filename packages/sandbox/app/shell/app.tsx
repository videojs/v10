import { PLATFORMS, PRESETS, STYLINGS } from '@app/constants';
import type { SourceId } from '@app/shared/sources';
import {
  DASH_SOURCE_IDS,
  DEFAULT_AUDIO_SOURCE,
  DEFAULT_DASH_SOURCE,
  MP4_SOURCE_IDS,
  SOURCE_IDS,
  SOURCES,
} from '@app/shared/sources';
import type { Platform, Preset, Styling } from '@app/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from './navbar';
import { Preview } from './preview';

function getPagePath(platform: Platform, preset: Preset): string {
  if (preset === 'background-video') return `/${platform}-background-video/`;
  return `/${platform}-${preset}/`;
}

function readParams() {
  const params = new URLSearchParams(location.search);
  return {
    platform: (params.get('platform') ?? 'html') as Platform,
    styling: (params.get('styling') ?? 'css') as Styling,
    preset: (params.get('preset') ?? 'video') as Preset,
    skin: (params.get('skin') ?? 'default') as 'default' | 'minimal',
    source: (params.get('source') ?? 'hls-1') as SourceId,
  };
}

export function App() {
  const initial = useMemo(readParams, []);
  const [platform, setPlatform] = useState<Platform>(initial.platform);
  const [styling, setStyling] = useState(initial.styling);
  const [preset, setPreset] = useState<Preset>(initial.preset);
  const [skin, setSkin] = useState(initial.skin);
  const [source, setSource] = useState(initial.source);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const pagePath = getPagePath(platform, preset);

  // Keep the URL in sync with all state (including skin + source)
  useEffect(() => {
    const params = new URLSearchParams({ platform, styling, preset, skin, source });
    history.replaceState(null, '', `/?${params}`);
  }, [platform, styling, preset, skin, source]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'skin-change', skin }, '*');
  }, [skin]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'source-change', source }, '*');
  }, [source]);

  // Constrain source to MP4 when switching to audio
  useEffect(() => {
    if (preset === 'audio' && SOURCES[source].type !== 'mp4') {
      setSource(DEFAULT_AUDIO_SOURCE);
    }
  }, [preset, source, setSource]);

  // Constrain source to DASH when switching to dash-video
  useEffect(() => {
    if (preset === 'dash-video' && SOURCES[source].type !== 'dash') {
      setSource(DEFAULT_DASH_SOURCE);
    }
  }, [preset, source, setSource]);

  // Background video does not have a Tailwind skin variant.
  useEffect(() => {
    if (preset === 'background-video' && styling === 'tailwind') {
      setStyling('css');
    }
  }, [preset, styling]);

  const availableSources = preset === 'audio' ? MP4_SOURCE_IDS : preset === 'dash-video' ? DASH_SOURCE_IDS : SOURCE_IDS;

  const handleSourceChange = useCallback((value: string) => setSource(value as SourceId), [setSource]);

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
        availableSources={availableSources}
        isBackgroundVideo={preset === 'background-video'}
        isSimpleHlsVideo={preset === 'simple-hls-video'}
        platforms={PLATFORMS}
        stylings={STYLINGS}
        presets={PRESETS}
        sources={SOURCES}
      />
      <Preview
        key={`${pagePath}:${styling}`}
        ref={iframeRef}
        pagePath={pagePath}
        skin={skin}
        styling={styling}
        source={source}
      />
    </div>
  );
}
