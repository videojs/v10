/**
 * Ejected React skin test page.
 *
 * Uses the actual generated ejected skin output from `build-ejected-skins.ts`.
 * The component source is synced from `site/src/content/ejected-skins.json`
 * by `scripts/sync-ejected-skins.ts`.
 */

import { createRoot } from 'react-dom/client';
import { VideoPlayer } from './_generated/ejected-react-video-skin';
import { MEDIA } from './shared';

function App() {
  return <VideoPlayer src={MEDIA.mp4.url} poster={MEDIA.mp4.poster} style={{ maxWidth: 800, aspectRatio: '16/9' }} />;
}

createRoot(document.getElementById('root')!).render(<App />);
