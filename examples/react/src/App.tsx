import type { ChangeEventHandler } from 'react';

import { FrostedSkin, HlsVideo, MinimalSkin, VideoProvider } from '@videojs/react';
import { useCallback, useMemo, useState } from 'react';

// NOTE: Commented out imports are for testing locally/externally defined skins.
// import { VideoProvider, Video } from '@videojs/react';
// import FrostedSkin from './skins/frosted/FrostedSkin';
// import MinimalSkin from './skins/toasted/MinimalSkin';

import FrostedEjectedSkin from './skins/frosted-eject/FrostedSkin';
import MinimalEjectedSkin from './skins/minimal-eject/MinimalSkin';
import '@videojs/react/skins/frosted.css';
import '@videojs/react/skins/minimal.css';
import './globals.css';

const skins = [
  {
    key: 'frosted',
    name: 'Frosted (imported)',
    component: FrostedSkin,
  },
  {
    key: 'frosted-eject',
    name: 'Frosted (ejected)',
    component: FrostedEjectedSkin,
  },
  {
    key: 'minimal',
    name: 'Minimal (imported)',
    component: MinimalSkin,
  },
  {
    key: 'minimal-eject',
    name: 'Minimal (ejected)',
    component: MinimalEjectedSkin,
  },
] as const;

type SkinKey = (typeof skins)[number]['key'];

const mediaSources = [
  {
    key: '1',
    name: 'Mux 1 (HLS)',
    value: 'https://stream.mux.com/fXNzVtmtWuyz00xnSrJg4OJH6PyNo6D02UzmgeKGkP5YQ.m3u8',
  },
  {
    key: '2',
    name: 'Mux 2 (HLS)',
    value: 'https://stream.mux.com/a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M.m3u8',
  },
  {
    key: '3',
    name: 'Mux 3 (MP4)',
    value: 'https://stream.mux.com/A3VXy02VoUinw01pwyomEO3bHnG4P32xzV7u1j1FSzjNg/high.mp4',
  },
  {
    key: '4',
    name: 'Mux 4 (HLS)',
    value: 'https://stream.mux.com/lyrKpPcGfqyzeI00jZAfW6MvP6GNPrkML.m3u8',
  },
] as const;

type MediaSourceKey = (typeof mediaSources)[number]['key'];

function getParam<T>(key: string, defaultValue: T): T {
  const params = new URLSearchParams(window.location.search);
  return (params.get(key) as T) || defaultValue;
}
function setParam(key: string, value: string) {
  const params = new URLSearchParams(window.location.search);
  params.set(key, value);
  const search = params.toString();
  const url = window.location.pathname + (search ? `?${search}` : '');
  window.history.replaceState(null, '', url);
}

const DEFAULT_SKIN: SkinKey = 'frosted';
const DEFAULT_MEDIA_SOURCE: MediaSourceKey = '1';

export default function App(): JSX.Element {
  const [skinKey, setSkinKey] = useState<SkinKey>(() => getParam('skin', DEFAULT_SKIN));
  const [mediaSourceKey, setMediaSourceKey] = useState<MediaSourceKey>(() => getParam('source', DEFAULT_MEDIA_SOURCE));

  const mediaSource = useMemo(() => {
    let match = mediaSources.find(m => m.key === mediaSourceKey);
    if (!match) {
      match = mediaSources.find(m => m.key === DEFAULT_MEDIA_SOURCE)!;
      setMediaSourceKey(match.key);
    }
    return match.value;
  }, [mediaSourceKey]);

  const Skin = useMemo(() => {
    let match = skins.find(s => s.key === skinKey);
    if (!match) {
      match = skins.find(s => s.key === DEFAULT_SKIN)!;
      setSkinKey(match.key);
    }
    return match.component;
  }, [skinKey]);

  const onChangeSkin: ChangeEventHandler<HTMLSelectElement> = useCallback((event) => {
    const value = event.target.value as SkinKey;
    setSkinKey(value);
    setParam('skin', value);
  }, []);
  const onChangeMediaSource: ChangeEventHandler<HTMLSelectElement> = useCallback((event) => {
    const value = event.target.value as MediaSourceKey;
    setMediaSourceKey(value);
    setParam('source', value);
  }, []);

  // Force a re-render on changes.
  const key = `${skinKey}-${mediaSourceKey}`;

  const playbackId = mediaSource.match(/stream\.mux\.com\/([^./]+)/)?.[1];
  const poster = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.webp` : undefined;

  return (
    <div className="min-h-screen bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-200">
      <header className="fixed top-0 z-10 inset-x-0 bg-white dark:bg-stone-800 shadow shadow-black/10 after:h-px after:absolute after:inset-x-0 after:top-full after:bg-black/5 transition-transform">
        <div className="grid grid-cols-5 h-2" aria-hidden="true">
          <div className="bg-yellow-500"></div>
          <div className="bg-orange-500"></div>
          <div className="bg-red-500"></div>
          <div className="bg-purple-500"></div>
          <div className="bg-blue-500"></div>
        </div>

        <div className="py-3 px-6 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="font-medium text-lg tracking-tight leading-tight dark:text-white">Playground</h1>
            <small className="block text-stone-400 text-sm">Test out the various skins for Video.js.</small>
          </div>

          <nav className="flex items-center gap-3">
            <select value={mediaSourceKey} onChange={onChangeMediaSource}>
              {mediaSources.map(({ key, name }) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
            <select value={skinKey} onChange={onChangeSkin}>
              {skins.map(({ key, name }) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </nav>
        </div>
      </header>

      <main className="min-h-screen flex justify-center items-center bg-radial bg-size-[16px_16px] from-stone-300 dark:from-stone-700 via-10% via-transparent to-transparent">
        <div className="w-full max-w-5xl mx-auto p-6">
          <VideoProvider key={key}>
            <Skin className="aspect-video shadow-lg shadow-black/15">
              {/* @ts-expect-error -- types are incorrect */}
              <HlsVideo src={mediaSource} poster={poster} playsInline />
            </Skin>
          </VideoProvider>
        </div>
      </main>
    </div>
  );
}
