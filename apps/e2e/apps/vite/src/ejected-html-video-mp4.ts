/**
 * Ejected HTML skin test page.
 *
 * Reads the actual output of `build-ejected-skins.ts` and renders it.
 * This validates that the generated ejected HTML works end-to-end.
 */

// Register all UI custom elements (without the skin wrapper)
import '@videojs/html/video/ui';

// Import the generated ejected skins JSON
import ejectedSkins from '../../../../../site/src/content/ejected-skins.json';

interface EjectedSkinEntry {
  id: string;
  html?: string;
  css?: string;
}

const skin = (ejectedSkins as EjectedSkinEntry[]).find((s) => s.id === 'default-video');

if (!skin?.html || !skin?.css) {
  throw new Error('Ejected skin "default-video" not found. Run `pnpm -F site ejected-skins` first.');
}

// Inject the ejected CSS into the document
const style = document.createElement('style');
style.textContent = skin.css;
document.head.appendChild(style);

// The ejected HTML contains:
//   <script type="module" src="...cdn..."></script>
//   <link rel="stylesheet" href="./player.css">
//   <video-player>...</video-player>
//
// Strip the <script> and <link> tags — we import modules via Vite instead.
// Extract just the <video-player>...</video-player> block.
const playerMatch = skin.html.match(/<video-player>[\s\S]*<\/video-player>/);

if (!playerMatch) {
  throw new Error('Could not find <video-player> in ejected HTML output.');
}

const root = document.getElementById('root')!;
root.innerHTML = `<div style="max-width: 800px; aspect-ratio: 16/9">${playerMatch[0]}</div>`;
