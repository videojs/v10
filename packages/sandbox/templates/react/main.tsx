// React sandbox — React player
// http://localhost:5173/react/

import { createPlayer } from '@videojs/react';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { videoFeatures } from '@videojs/react/video';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SKINS } from '../constants';
import type { Skin } from '../types';
import { useSkinSwitcher } from '../utils/use-skin-switcher';
import { SkinComponent } from './skins';

const { Provider } = createPlayer({
  features: videoFeatures,
});

const HLS_SOURCES = [
  'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8',
  'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008.m3u8',
];

function App() {
  const [skin, setSkin] = useSkinSwitcher();
  const [src, setSrc] = useState(HLS_SOURCES[0]);

  return (
    <div className="flex flex-col justify-center items-center gap-4 my-4">
      <select value={skin} onChange={(e) => setSkin(e.target.value as Skin)} aria-label="Skin">
        {SKINS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <Provider>
        <SkinComponent skin={skin} className="w-full aspect-video max-w-4xl mx-auto">
          <HlsVideo src={src} />
        </SkinComponent>
      </Provider>

      <button
        type="button"
        onClick={() => setSrc((current) => (current === HLS_SOURCES[0] ? HLS_SOURCES[1] : HLS_SOURCES[0]))}
        className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-500 active:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
      >
        Toggle HLS Source
      </button>
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
