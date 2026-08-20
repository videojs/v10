import { Video, VideoPlayer } from '@videojs/react/video';
import { createRoot } from 'react-dom/client';

import { DefaultVideoSkin } from '../canonical/skins/default-video/skin';
import './styles.css';

function App() {
  return (
    <VideoPlayer>
      <DefaultVideoSkin className="preview-player">
        <Video
          src="https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8"
          playsInline
          crossOrigin="anonymous"
        />
      </DefaultVideoSkin>
    </VideoPlayer>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
