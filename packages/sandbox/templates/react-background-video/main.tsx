import '@videojs/react/background/skin.css';
import { BackgroundVideo, BackgroundVideoSkin } from '@videojs/react/background';
import { createRoot } from 'react-dom/client';
import { BackgroundVideoProvider } from '../shared/react/providers';
import { BACKGROUND_VIDEO_SRC } from '../shared/sources';

function App() {
  return (
    <BackgroundVideoProvider>
      <BackgroundVideoSkin>
        <BackgroundVideo src={BACKGROUND_VIDEO_SRC} />
      </BackgroundVideoSkin>
    </BackgroundVideoProvider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
