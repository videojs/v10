// React GIF sandbox — animated GIF renderer demo
// http://localhost:5173/react-gif/

import { playbackFeature } from '@videojs/core/dom';
import { createPlayer, PlayButton } from '@videojs/react';
import { createRoot } from 'react-dom/client';
import { AnimatedGif } from '../gif-media/react';

const { Provider, Container } = createPlayer({ features: [playbackFeature] });

// A publicly accessible animated GIF for demo purposes
const GIF_SRC =
  'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExMzlsaW43OHN5ZnJmdmV0cGtvY3p3a3BtejhwZGMxZGdqOGhkejAzdCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oriO0OEd9QIDdllqo/giphy.gif';

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32 }}>
      <h1 style={{ fontFamily: 'monospace', fontSize: 20 }}>React GIF Demo</h1>
      <Provider>
        <Container style={{ position: 'relative', display: 'inline-block' }}>
          <AnimatedGif src={GIF_SRC} style={{ display: 'block', width: 480, height: 270 }} />
          <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
            <PlayButton />
          </div>
        </Container>
      </Provider>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
