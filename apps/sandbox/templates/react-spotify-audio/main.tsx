import '@app/styles.css';
import { AudioPlayer } from '@app/shared/react/players';
import { AudioSkinComponent } from '@app/shared/react/skins';
import { useSkin } from '@app/shared/react/use-skin';
import { SPOTIFY_AUDIO_SRC } from '@app/shared/sources';
import type { Styling } from '@app/types';
import { SpotifyAudio } from '@videojs/react/media/spotify-audio';
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';

function readStyling(): Styling {
  return new URLSearchParams(location.search).get('styling') === 'tailwind' ? 'tailwind' : 'css';
}

function App() {
  const skin = useSkin();
  const styling = useMemo(readStyling, []);

  return (
    <AudioPlayer>
      <AudioSkinComponent skin={skin} styling={styling} className="mx-auto w-full max-w-xl">
        {/* Hidden unless it is showing Spotify's own chrome, so it takes no room and needs no size. */}
        <SpotifyAudio src={SPOTIFY_AUDIO_SRC} />
      </AudioSkinComponent>
    </AudioPlayer>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
