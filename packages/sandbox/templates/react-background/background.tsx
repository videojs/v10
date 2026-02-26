import '@videojs/react/background/skin.css';
import { createPlayer, features } from '@videojs/react';
import { BackgroundVideo, BackgroundVideoSkin } from '@videojs/react/background';
import { createRoot } from 'react-dom/client';

const { Provider: BackgroundVideoProvider } = createPlayer({
  features: features.background,
});

export function App() {
  return (
    <BackgroundVideoProvider>
      <BackgroundVideoSkin>
        <BackgroundVideo src="https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008/low.mp4" />
      </BackgroundVideoSkin>
    </BackgroundVideoProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
