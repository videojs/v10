// React GIF sandbox — animated GIF renderer demo
// http://localhost:5173/react-gif/

import { playbackFeature } from '@videojs/core/dom';
import { PauseIcon, PlayIcon, RestartIcon } from '@videojs/icons/react';
import { Container, createPlayer, PlayButton } from '@videojs/react';
import { createRoot } from 'react-dom/client';
import { AnimatedGif } from '../gif-media/react';

const { Provider } = createPlayer({ features: [playbackFeature] });

// A publicly accessible animated GIF for demo purposes
const GIF_SRC =
  'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzlsaW43OHN5ZnJmdmV0cGtvY3p3a3BtejhwZGMxZGdqOGhkejAzdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oriO0OEd9QIDdllqo/giphy.gif';

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        padding: 32,
        fontFamily: 'monospace',
      }}
    >
      <h1 style={{ fontSize: 20, margin: 0 }}>React GIF Demo</h1>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* GifMedia renderer with play/pause control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#555' }}>GifMedia (canvas + playbackFeature)</p>
          <Provider>
            <div
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                background: '#000',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <Container>
                <AnimatedGif src={GIF_SRC} style={{ display: 'block', width: 480 }} />
              </Container>
              <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', background: '#1a1a1a' }}>
                <PlayButton
                  render={(props, state) => (
                    <button {...props} style={buttonStyle}>
                      {state.ended ? <RestartIcon /> : state.paused ? <PlayIcon /> : <PauseIcon />}
                    </button>
                  )}
                />
              </div>
            </div>
          </Provider>
        </div>

        {/* Native img for comparison */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#555' }}>Native &lt;img&gt; (always playing)</p>
          <img src={GIF_SRC} style={{ display: 'block', width: 480, borderRadius: 6 }} alt="Animated GIF" />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
