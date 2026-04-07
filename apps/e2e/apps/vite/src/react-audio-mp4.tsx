import { createPlayer } from '@videojs/react';
import { Audio, AudioSkin, audioFeatures } from '@videojs/react/audio';
import '@videojs/react/audio/skin.css';
import { createRoot } from 'react-dom/client';
import { MEDIA } from './shared';

const Player = createPlayer({ features: audioFeatures });

function App() {
  return (
    <Player.Provider>
      <AudioSkin style={{ maxWidth: 600, margin: '0 auto' }}>
        <Audio src={MEDIA.mp4.url} />
      </AudioSkin>
    </Player.Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
