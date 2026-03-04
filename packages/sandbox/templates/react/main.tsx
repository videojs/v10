// React sandbox — React player
// http://localhost:5173/react/

import { createPlayer } from '@videojs/react';
import { Audio, audioFeatures } from '@videojs/react/audio';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { videoFeatures } from '@videojs/react/video';
import { createRoot } from 'react-dom/client';
import { SKINS } from '../constants';
import type { Skin } from '../types';
import { AudioSkinComponent, VideoSkinComponent } from './skins';

import '@videojs/react/video/minimal-skin.css';
import '@videojs/react/video/skin.css';
import '@videojs/react/audio/minimal-skin.css';
import '@videojs/react/audio/skin.css';
import { useSkinSwitcher } from '../utils/use-skin-switcher';

const { Provider: VideoProvider } = createPlayer({
  features: videoFeatures,
});
const { Provider: AudioProvider } = createPlayer({
  features: audioFeatures,
});

const HLS_SOURCES = [
  'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8',
  'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008.m3u8',
];

function App() {
  const [skin, setSkin] = useSkinSwitcher();
  const [src, setSrc] = useState(HLS_SOURCES[0]);

  return (
    <div className="flex flex-col justify-center items-center  gap-12 my-4">
      <select value={skin} onChange={(e) => setSkin(e.target.value as Skin)} aria-label="Skin">
        {SKINS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <VideoProvider>
        <VideoSkinComponent skin={skin} className="w-full aspect-video max-w-4xl mx-auto">
          <Video src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4" />
        </VideoSkinComponent>
      </VideoProvider>

      <AudioProvider>
        <AudioSkinComponent skin={skin} className="w-full max-w-xl mx-auto">
          <Audio src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4" />
        </AudioSkinComponent>
      </AudioProvider>

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

createRoot(document.getElementById('root')!).render(<App />);
