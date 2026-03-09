// SPF + Video.js integration sandbox — React
// http://localhost:5173/spf-react/
//
// React equivalent of the spf-html sandbox: SPF inside a VJS player with
// play/mute controls. SpfVideo registers itself via useMediaRegistration so
// the store discovers it without any querySelector involved.

import { PauseIcon, PlayIcon, RestartIcon, VolumeHighIcon, VolumeOffIcon } from '@videojs/icons/react';
import { Container, createPlayer, features, MuteButton, PlayButton } from '@videojs/react';
import { SpfVideo } from '@videojs/react/media/spf-video';
import { createRoot } from 'react-dom/client';

const { Provider } = createPlayer({ features: features.video });

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
    <Provider>
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
          <SpfVideo
            src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4.m3u8"
            preload="auto"
            playsInline
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
    </Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
