// React sandbox — React player
// http://localhost:5173/react/

import { Container, createPlayer, features, Video } from '@videojs/react';
import { createRoot } from 'react-dom/client';

const { Provider } = createPlayer({
  features: features.video,
});

function App() {
  return (
    <Provider>
      <Container>
        <Video src="https://stream.mux.com/lhnU49l1VGi3zrTAZhDm9LUUxSjpaPW9BL4jY25Kwo4/highest.mp4" />
      </Container>
    </Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
