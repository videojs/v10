import type { Renderer, UseCase } from '@/stores/installation';
import { VALID_RENDERERS } from '@/stores/installation';

export interface DetectionResult {
  renderer: Renderer;
  label: string;
}

const DOMAIN_RULES: Array<{ match: (hostname: string) => boolean; renderer: Renderer; label: string }> = [
  // {
  //   match: (h) => h === 'youtube.com' || h === 'www.youtube.com' || h === 'youtu.be' || h === 'm.youtube.com',
  //   renderer: 'youtube',
  //   label: 'YouTube',
  // },
  // {
  //   match: (h) => h === 'vimeo.com' || h === 'www.vimeo.com' || h === 'player.vimeo.com',
  //   renderer: 'vimeo',
  //   label: 'Vimeo',
  // },
  // {
  //   match: (h) => h === 'stream.mux.com' || h === 'mux.com' || h === 'www.mux.com',
  //   renderer: 'mux-video',
  //   label: 'Mux',
  // },
  // {
  //   match: (h) => h === 'open.spotify.com',
  //   renderer: 'spotify',
  //   label: 'Spotify',
  // },
  // {
  //   match: (h) =>
  //     h === 'watch.videodelivery.net' ||
  //     h === 'videodelivery.net' ||
  //     h === 'cloudflarestream.com' ||
  //     h === 'www.cloudflarestream.com',
  //   renderer: 'cloudflare',
  //   label: 'Cloudflare',
  // },
  // {
  //   match: (h) => h === 'cdn.jwplayer.com' || h === 'content.jwplatform.com',
  //   renderer: 'jwplayer',
  //   label: 'JW Player',
  // },
  // {
  //   match: (h) => h === 'fast.wistia.com' || h === 'fast.wistia.net' || h.endsWith('.wistia.com'),
  //   renderer: 'wistia',
  //   label: 'Wistia',
  // },
];

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.ogv']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.aac']);

function parseUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    try {
      return new URL(`https://${input}`);
    } catch {
      return null;
    }
  }
}

function getExtension(pathname: string): string {
  const clean = pathname.split('?')[0]!.split('#')[0]!;
  const dot = clean.lastIndexOf('.');
  if (dot === -1) return '';
  return clean.slice(dot).toLowerCase();
}

export function detectRenderer(url: string, useCase: UseCase): DetectionResult | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const parsed = parseUrl(trimmed);
  if (!parsed) return null;

  // Check domain rules first
  for (const rule of DOMAIN_RULES) {
    if (rule.match(parsed.hostname)) {
      if (!isRendererValidForUseCase(rule.renderer, useCase)) return null;
      return { renderer: rule.renderer, label: rule.label };
    }
  }

  // Check file extension
  const ext = getExtension(parsed.pathname);

  if (ext === '.m3u8') {
    if (!isRendererValidForUseCase('hls', useCase)) return null;
    return { renderer: 'hls', label: 'HLS' };
  }

  // if (ext === '.mpd') {
  //   if (!isRendererValidForUseCase('dash', useCase)) return null;
  //   return { renderer: 'dash', label: 'DASH' };
  // }

  if (VIDEO_EXTENSIONS.has(ext)) {
    if (!isRendererValidForUseCase('html5-video', useCase)) return null;
    return { renderer: 'html5-video', label: 'HTML5 Video' };
  }

  if (AUDIO_EXTENSIONS.has(ext)) {
    if (!isRendererValidForUseCase('html5-audio', useCase)) return null;
    return { renderer: 'html5-audio', label: 'HTML5 Audio' };
  }

  return null;
}

export function isRendererValidForUseCase(renderer: Renderer, useCase: UseCase): boolean {
  return VALID_RENDERERS[useCase].includes(renderer);
}

const RENDERER_ARTICLES: Record<Renderer, 'a' | 'an'> = {
  'background-video': 'a',
  // cloudflare: 'a',
  // dash: 'a',
  hls: 'an',
  'html5-audio': 'an',
  'html5-video': 'an',
  // jwplayer: 'a',
  // 'mux-audio': 'a',
  // 'mux-background-video': 'a',
  // 'mux-video': 'a',
  // spotify: 'a',
  // vimeo: 'a',
  // wistia: 'a',
  // youtube: 'a',
};

export function articleFor(renderer: Renderer): 'a' | 'an' {
  return RENDERER_ARTICLES[renderer];
}
