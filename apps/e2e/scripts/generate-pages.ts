/**
 * Generates Vite test pages from PageEntry definitions.
 *
 * Reads the media type configs and page arrays, then writes .ts/.tsx + .html
 * files to `apps/vite/src/`. Special pages (ejected skins, captions) are
 * hand-written and not generated.
 *
 * Run: `pnpm --dir apps/e2e generate-pages`
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../apps/vite/src');

// ---------------------------------------------------------------------------
// Media type config — maps media element name to its import + attributes
// ---------------------------------------------------------------------------

interface MediaTypeConfig {
  /** Custom element tag (e.g. 'hls-video', 'mux-video') */
  element: string;
  /** Side-effect imports to register the element */
  imports: string[];
  /** HTML attributes on the media element */
  attrs: string;
  /** Whether a storyboard track should be included */
  hasStoryboard: boolean;
  /** Whether a poster image should be included */
  hasPoster: boolean;
  /** Whether this is an audio element */
  isAudio: boolean;
}

const MEDIA_TYPES: Record<string, MediaTypeConfig> = {
  video: {
    element: 'video',
    imports: [],
    attrs: 'playsinline crossorigin="anonymous"',
    hasStoryboard: true,
    hasPoster: true,
    isAudio: false,
  },
  'hls-video': {
    element: 'hls-video',
    imports: ['@videojs/html/media/hls-video'],
    attrs: 'playsinline crossorigin="anonymous"',
    hasStoryboard: true,
    hasPoster: true,
    isAudio: false,
  },
  'simple-hls-video': {
    element: 'simple-hls-video',
    imports: ['@videojs/html/media/simple-hls-video'],
    attrs: 'playsinline crossorigin="anonymous" preload="metadata"',
    hasStoryboard: true,
    hasPoster: true,
    isAudio: false,
  },
  'native-hls-video': {
    element: 'native-hls-video',
    imports: ['@videojs/html/media/native-hls-video'],
    attrs: 'playsinline crossorigin="anonymous"',
    hasStoryboard: true,
    hasPoster: true,
    isAudio: false,
  },
  'mux-video': {
    element: 'mux-video',
    imports: ['@videojs/html/media/mux-video'],
    attrs: 'playsinline crossorigin="anonymous"',
    hasStoryboard: true,
    hasPoster: true,
    isAudio: false,
  },
  'dash-video': {
    element: 'dash-video',
    imports: ['@videojs/html/media/dash-video'],
    attrs: 'playsinline',
    hasStoryboard: false,
    hasPoster: false,
    isAudio: false,
  },
  audio: {
    element: 'audio',
    imports: [],
    attrs: '',
    hasStoryboard: false,
    hasPoster: false,
    isAudio: true,
  },
  'mux-audio': {
    element: 'mux-audio',
    imports: ['@videojs/html/media/mux-audio'],
    attrs: 'crossorigin="anonymous"',
    hasStoryboard: false,
    hasPoster: false,
    isAudio: true,
  },
};

// React component names for media elements
const REACT_MEDIA: Record<string, { component: string; importPath: string }> = {
  video: { component: 'Video', importPath: '@videojs/react/video' },
  'hls-video': { component: 'HlsVideo', importPath: '@videojs/react/media/hls-video' },
  audio: { component: 'Audio', importPath: '@videojs/react/audio' },
};

// CDN import paths (override standard imports)
const CDN_IMPORTS: Record<string, string[]> = {
  video: ['@videojs/html/cdn/video'],
  'hls-video': ['@videojs/html/cdn/video', '@videojs/html/cdn/media/hls-video'],
};

// ---------------------------------------------------------------------------
// Page entry type (matches fixtures/media.ts)
// ---------------------------------------------------------------------------

interface PageDef {
  name: string;
  path: string;
  framework: 'html' | 'react';
  media: string;
  resource: string;
  category?: 'cdn';
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function htmlShell(title: string, scriptSrc: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./${scriptSrc}"></script>
  </body>
</html>
`;
}

function htmlVideoPage(config: MediaTypeConfig, resource: string, imports: string[]): string {
  const allImports = [...imports, `import { MEDIA } from './shared';`].join('\n');

  const storyboard = config.hasStoryboard
    ? `\n        <track kind="metadata" label="thumbnails" src="\${MEDIA.${resource}.storyboard}" default />`
    : '';

  const poster = config.hasPoster
    ? `\n      <img slot="poster" src="\${MEDIA.${resource}.poster}" alt="Video poster" />`
    : '';

  const attrs = config.attrs ? ` ${config.attrs}` : '';

  return `${allImports}

const html = String.raw;

document.getElementById('root')!.innerHTML = html\`
  <video-player>
    <video-skin style="max-width: 800px; aspect-ratio: 16/9">
      <${config.element} src="\${MEDIA.${resource}.url}"${attrs}>${storyboard}
      </${config.element}>${poster}
    </video-skin>
  </video-player>
\`;
`;
}

function htmlAudioPage(config: MediaTypeConfig, resource: string, imports: string[]): string {
  const allImports = [...imports, `import { MEDIA } from './shared';`].join('\n');
  const attrs = config.attrs ? ` ${config.attrs}` : '';

  return `${allImports}

const html = String.raw;

document.getElementById('root')!.innerHTML = html\`
  <div style="max-width: 600px; margin: 0 auto">
    <audio-player>
      <audio-skin>
        <${config.element} src="\${MEDIA.${resource}.url}"${attrs}></${config.element}>
      </audio-skin>
    </audio-player>
  </div>
\`;
`;
}

function reactVideoPage(media: string, resource: string): string {
  const reactMedia = REACT_MEDIA[media];
  if (!reactMedia) throw new Error(`No React component mapping for media type: ${media}`);

  const isDefaultVideo = media === 'video';
  const mediaImport = isDefaultVideo
    ? `import { Video, VideoSkin, videoFeatures } from '@videojs/react/video';`
    : `import { ${reactMedia.component} } from '${reactMedia.importPath}';\nimport { VideoSkin, videoFeatures } from '@videojs/react/video';`;

  return `import { createPlayer } from '@videojs/react';
${mediaImport}
import '@videojs/react/video/skin.css';
import { createRoot } from 'react-dom/client';
import { MEDIA } from './shared';

const Player = createPlayer({ features: videoFeatures });

function App() {
  return (
    <Player.Provider>
      <VideoSkin poster={MEDIA.${resource}.poster} style={{ maxWidth: 800, aspectRatio: '16/9' }}>
        <${reactMedia.component} src={MEDIA.${resource}.url} playsInline crossOrigin="anonymous">
          <track kind="metadata" label="thumbnails" src={MEDIA.${resource}.storyboard} default />
        </${reactMedia.component}>
      </VideoSkin>
    </Player.Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
`;
}

function reactAudioPage(media: string, resource: string): string {
  const reactMedia = REACT_MEDIA[media];
  if (!reactMedia) throw new Error(`No React component mapping for media type: ${media}`);

  const isDefaultAudio = media === 'audio';
  const mediaImport = isDefaultAudio
    ? `import { Audio, AudioSkin, audioFeatures } from '@videojs/react/audio';`
    : `import { ${reactMedia.component} } from '${reactMedia.importPath}';\nimport { AudioSkin, audioFeatures } from '@videojs/react/audio';`;

  return `import { createPlayer } from '@videojs/react';
${mediaImport}
import '@videojs/react/audio/skin.css';
import { createRoot } from 'react-dom/client';
import { MEDIA } from './shared';

const Player = createPlayer({ features: audioFeatures });

function App() {
  return (
    <Player.Provider>
      <AudioSkin style={{ maxWidth: 600, margin: '0 auto' }}>
        <${reactMedia.component} src={MEDIA.${resource}.url} />
      </AudioSkin>
    </Player.Provider>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
`;
}

// ---------------------------------------------------------------------------
// Page definitions (drive generation from here)
// ---------------------------------------------------------------------------

const PAGES: PageDef[] = [
  // HTML Video
  { name: 'HTML Video MP4', path: 'html-video-mp4', framework: 'html', media: 'video', resource: 'mp4' },
  { name: 'HTML Video HLS', path: 'html-video-hls', framework: 'html', media: 'hls-video', resource: 'hlsTs' },
  {
    name: 'HTML Simple HLS Video fMP4',
    path: 'html-simple-hls-video-fmp4',
    framework: 'html',
    media: 'simple-hls-video',
    resource: 'hlsFmp4',
  },
  { name: 'HTML DASH Video', path: 'html-dash-video', framework: 'html', media: 'dash-video', resource: 'dash' },
  {
    name: 'HTML Native HLS Video',
    path: 'html-native-hls-video',
    framework: 'html',
    media: 'native-hls-video',
    resource: 'hlsTs',
  },
  { name: 'HTML Mux Video', path: 'html-mux-video', framework: 'html', media: 'mux-video', resource: 'hlsTs' },

  // HTML Audio
  { name: 'HTML Audio MP4', path: 'html-audio-mp4', framework: 'html', media: 'audio', resource: 'mp4' },
  { name: 'HTML Mux Audio', path: 'html-mux-audio', framework: 'html', media: 'mux-audio', resource: 'hlsTs' },

  // React Video
  { name: 'React Video MP4', path: 'react-video-mp4', framework: 'react', media: 'video', resource: 'mp4' },
  { name: 'React Video HLS', path: 'react-video-hls', framework: 'react', media: 'hls-video', resource: 'hlsTs' },

  // React Audio
  { name: 'React Audio MP4', path: 'react-audio-mp4', framework: 'react', media: 'audio', resource: 'mp4' },

  // CDN
  { name: 'CDN Video MP4', path: 'cdn-video-mp4', framework: 'html', media: 'video', resource: 'mp4', category: 'cdn' },
  {
    name: 'CDN Video HLS',
    path: 'cdn-video-hls',
    framework: 'html',
    media: 'hls-video',
    resource: 'hlsTs',
    category: 'cdn',
  },
];

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

function getImports(page: PageDef, config: MediaTypeConfig): string[] {
  if (page.category === 'cdn') {
    const cdnImports = CDN_IMPORTS[page.media];
    if (!cdnImports) throw new Error(`No CDN imports for media type: ${page.media}`);
    return cdnImports.map((i) => `import '${i}';`);
  }

  const playerType = config.isAudio ? 'audio' : 'video';
  const base = [`import '@videojs/html/${playerType}/player';`, `import '@videojs/html/${playerType}/skin';`];

  for (const imp of config.imports) {
    base.push(`import '${imp}';`);
  }

  return base;
}

function generatePage(page: PageDef): { ts: string; html: string; ext: string } {
  const config = MEDIA_TYPES[page.media];
  if (!config) throw new Error(`Unknown media type: ${page.media}`);

  const ext = page.framework === 'react' ? 'tsx' : 'ts';

  let ts: string;

  if (page.framework === 'react') {
    ts = config.isAudio ? reactAudioPage(page.media, page.resource) : reactVideoPage(page.media, page.resource);
  } else {
    const imports = getImports(page, config);
    ts = config.isAudio ? htmlAudioPage(config, page.resource, imports) : htmlVideoPage(config, page.resource, imports);
  }

  const html = htmlShell(page.name, `${page.path}.${ext}`);

  return { ts, html, ext };
}

function generateIndexHtml(pages: PageDef[]): string {
  const htmlVideo = pages.filter((p) => p.framework === 'html' && !MEDIA_TYPES[p.media]?.isAudio && !p.category);
  const htmlAudio = pages.filter((p) => p.framework === 'html' && MEDIA_TYPES[p.media]?.isAudio && !p.category);
  const reactVideo = pages.filter((p) => p.framework === 'react' && !MEDIA_TYPES[p.media]?.isAudio);
  const reactAudio = pages.filter((p) => p.framework === 'react' && MEDIA_TYPES[p.media]?.isAudio);
  const cdn = pages.filter((p) => p.category === 'cdn');

  function list(entries: PageDef[]): string {
    return entries.map((p) => `        <li><a href="/${p.path}.html">${p.name}</a></li>`).join('\n');
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Video.js E2E Test Pages</title>
  </head>
  <body>
    <h1>Video.js E2E Test Pages</h1>
    <nav>
      <h2>HTML (Web Components)</h2>
      <ul>
${list(htmlVideo)}
${list(htmlAudio)}
        <li><a href="/html-video-captions.html">HTML Video - Captions</a></li>
      </ul>
      <h2>React</h2>
      <ul>
${list(reactVideo)}
${list(reactAudio)}
      </ul>
      <h2>Ejected Skins</h2>
      <ul>
        <li><a href="/ejected-html-video-mp4.html">Ejected HTML Video - MP4</a></li>
        <li><a href="/ejected-react-video-mp4.html">Ejected React Video - MP4</a></li>
      </ul>
      <h2>CDN Bundles</h2>
      <ul>
${list(cdn)}
      </ul>
    </nav>
  </body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('[generate-pages] Generating Vite test pages...');

let count = 0;

for (const page of PAGES) {
  const { ts, html, ext } = generatePage(page);

  writeFileSync(resolve(OUT_DIR, `${page.path}.${ext}`), ts);
  writeFileSync(resolve(OUT_DIR, `${page.path}.html`), html);
  count++;
}

// Generate index.html
writeFileSync(resolve(OUT_DIR, 'index.html'), generateIndexHtml(PAGES));

console.log(`[generate-pages] Generated ${count} pages + index.html`);
