import '@app/styles.css';
// HlsVideo + Video.js integration sandbox — React
// http://localhost:5173/hls-video-react/
//
// React equivalent of the hls-video-html sandbox: HlsVideo inside a VJS
// player with play/mute controls. HlsVideo registers itself via
// useMediaAttach so the store discovers it without any querySelector.
import { Container, createPlayer, MuteButton, PlayButton } from '@videojs/react';
import { PauseIcon, PlayIcon, RestartIcon, VolumeHighIcon, VolumeOffIcon } from '@videojs/react/icons';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { videoFeatures } from '@videojs/react/video';
import { createRoot } from 'react-dom/client';

const { Player } = createPlayer({ features: videoFeatures });

const buttonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  padding: '6px',
  borderRadius: '4px',
};

function App() {
  return (
    <Player>
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          background: '#000',
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        <Container>
          <HlsVideo
            src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8"
            preload="auto"
            playsInline
            crossOrigin=""
            style={{ width: '640px', aspectRatio: '16/9', display: 'block' }}
          />
        </Container>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 8px', background: '#1a1a1a' }}>
          <PlayButton
            render={(props, state) => (
              <button {...props} style={buttonStyle}>
                {state.ended ? <RestartIcon /> : state.paused ? <PlayIcon /> : <PauseIcon />}
              </button>
            )}
          />
          <MuteButton
            render={(props, state) => (
              <button {...props} style={buttonStyle}>
                {state.muted ? <VolumeOffIcon /> : <VolumeHighIcon />}
              </button>
            )}
          />
        </div>
      </div>
    </Player>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
