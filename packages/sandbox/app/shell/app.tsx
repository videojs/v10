import { PLATFORMS, PRESETS, STYLINGS } from '@app/constants';
import type { SourceId } from '@app/shared/sources';
import { DEFAULT_AUDIO_SOURCE, MP4_SOURCE_IDS, SOURCE_IDS, SOURCES } from '@app/shared/sources';
import type { Platform, Preset, Styling } from '@app/types';
import { useSkinSwitcher } from '@app/utils/use-skin-switcher';
import { useSourceSwitcher } from '@app/utils/use-source-switcher';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from './navbar';
import { Preview } from './preview';

function getPagePath(platform: Platform, styling: Styling, preset: Preset): string {
  if (preset === 'background-video') return `/${platform}-background-video/`;
  if (styling === 'tailwind') return `/${platform}-${preset}-tailwind/`;
  return `/${platform}-${preset}/`;
}

function readParams() {
  const params = new URLSearchParams(location.search);
  return {
    platform: (params.get('platform') ?? 'html') as Platform,
    styling: (params.get('styling') ?? 'css') as Styling,
    preset: (params.get('preset') ?? 'video') as Preset,
  };
}

export function App() {
  const initial = useMemo(readParams, []);
  const [platform, setPlatform] = useState<Platform>(initial.platform);
  const [styling, setStyling] = useState<Styling>(initial.styling);
  const [preset, setPreset] = useState<Preset>(initial.preset);
  const [skin, setSkin] = useSkinSwitcher();
  const [source, setSource] = useSourceSwitcher();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const pagePath = getPagePath(platform, styling, preset);

  // Keep the URL in sync with all state (including skin + source)
  useEffect(() => {
    const params = new URLSearchParams({ platform, styling, preset, skin, source });
    history.replaceState(null, '', `/?${params}`);
  }, [platform, styling, preset, skin, source]);

  // Send postMessage to iframe for skin changes (skip initial mount — iframe reads localStorage)
  const skinMountRef = useRef(true);
  useEffect(() => {
    if (skinMountRef.current) {
      skinMountRef.current = false;
      return;
    }
    iframeRef.current?.contentWindow?.postMessage({ type: 'skin-change', skin }, '*');
  }, [skin]);

  // Send postMessage to iframe for source changes (skip initial mount — iframe reads localStorage)
  const sourceMountRef = useRef(true);
  useEffect(() => {
    if (sourceMountRef.current) {
      sourceMountRef.current = false;
      return;
    }
    iframeRef.current?.contentWindow?.postMessage({ type: 'source-change', source }, '*');
  }, [source]);

  // Constrain source to MP4 when switching to audio
  useEffect(() => {
    if (preset === 'audio' && SOURCES[source].type !== 'mp4') {
      setSource(DEFAULT_AUDIO_SOURCE);
    }
  }, [preset, source, setSource]);

  // Constrain styling when switching to background-video
  useEffect(() => {
    if (preset === 'background-video' && styling === 'tailwind') {
      setStyling('css');
    }
  }, [preset, styling]);

  const availableSources = preset === 'audio' ? MP4_SOURCE_IDS : SOURCE_IDS;

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
      <Preview ref={iframeRef} pagePath={pagePath} skin={skin} source={source} />
    </div>
  );
}
