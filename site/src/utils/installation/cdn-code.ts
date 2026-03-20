import type { Renderer, Skin, UseCase } from '@/stores/installation';

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@videojs/html/cdn';

function getCdnFileName(useCase: UseCase, skin: Skin): string {
  if (useCase === 'background-video') return 'background';
  if (skin === 'minimal-video') return 'video-minimal';
  if (skin === 'minimal-audio') return 'audio-minimal';
  return skin;
}

function getCdnMediaSubpath(renderer: Renderer): string | null {
  const map: Partial<Record<Renderer, string>> = {
    hls: 'hls-video',
  };

  return map[renderer] ?? null;
}

export function generateCdnCode(useCase: UseCase, skin: Skin, renderer: Renderer): string {
  const name = getCdnFileName(useCase, skin);
  const mediaSubpath = getCdnMediaSubpath(renderer);

  const scriptLines = [`<script type="module" src="${CDN_BASE}/${name}.js"></script>`];

  if (mediaSubpath) {
    scriptLines.push(`<script type="module" src="${CDN_BASE}/media/${mediaSubpath}.js"></script>`);
  }

  return scriptLines.join('\n');
}
