import type { Renderer, UseCase } from '@/utils/installation/types';
import { getInstallationPreset } from '@/utils/installation/types';

export interface DetectionResult {
  renderer: Renderer;
  label: string;
}

const DOMAIN_RULES: Array<{ match: (hostname: string) => boolean; renderer: Renderer; label: string }> = [
  // Mux is matched by hostname before the `.m3u8` extension rule below, so a
  // `stream.mux.com` URL resolves to a Mux renderer (with Mux Data) rather than
  // generic HLS. The two Mux rules are ordered video-then-audio; the loop's
  // use-case guard skips the invalid one and `continue`s to the next.
  {
    match: (h) => h === 'stream.mux.com' || h === 'mux.com' || h === 'www.mux.com',
    renderer: 'mux-video',
    label: 'Mux',
  },
  {
    match: (h) => h === 'stream.mux.com' || h === 'mux.com' || h === 'www.mux.com',
    renderer: 'mux-audio',
    label: 'Mux',
  },
  {
    match: (h) => h === 'vimeo.com' || h === 'www.vimeo.com' || h === 'player.vimeo.com',
    renderer: 'vimeo',
    label: 'Vimeo',
  },
  {
    match: (h) =>
      h === 'youtube.com' ||
      h === 'www.youtube.com' ||
      h === 'youtu.be' ||
      h === 'm.youtube.com' ||
      h === 'youtube-nocookie.com' ||
      h === 'www.youtube-nocookie.com',
    renderer: 'youtube',
    label: 'YouTube',
  },
  {
    match: (h) => h === 'open.spotify.com',
    renderer: 'spotify',
    label: 'Spotify',
  },
  {
    // Suffix matches, unlike the other rules: Cloudflare serves signed and
    // access-controlled videos from per-customer subdomains
    // (`customer-<code>.cloudflarestream.com`), so exact hostnames would miss
    // the most common real-world URLs.
    match: (h) =>
      h === 'videodelivery.net' ||
      h.endsWith('.videodelivery.net') ||
      h === 'cloudflarestream.com' ||
      h.endsWith('.cloudflarestream.com'),
    renderer: 'cloudflare',
    label: 'Cloudflare Stream',
  },
  {
    // `vm.tiktok.com` is deliberately absent: those short links carry an opaque
    // code instead of the numeric video id the media needs, and resolving one
    // takes an HTTP redirect the picker can't follow.
    match: (h) => h === 'tiktok.com' || h === 'www.tiktok.com',
    renderer: 'tiktok',
    label: 'TikTok',
  },
  {
    // `clips.twitch.tv` is deliberately absent: clips are a different embed
    // the Twitch media element cannot play.
    match: (h) => h === 'twitch.tv' || h === 'www.twitch.tv' || h === 'go.twitch.tv',
    renderer: 'twitch',
    label: 'Twitch',
  },
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

  // Check domain rules first. When a host matches but its renderer isn't valid
  // for the current use case, keep looking (so e.g. a Mux URL in an audio use
  // case falls through from the mux-video rule to the mux-audio rule).
  for (const rule of DOMAIN_RULES) {
    if (rule.match(parsed.hostname) && isRendererValidForUseCase(rule.renderer, useCase)) {
      return { renderer: rule.renderer, label: rule.label };
    }
  }

  // Check file extension
  const ext = getExtension(parsed.pathname);

  if (ext === '.m3u8') {
    if (!isRendererValidForUseCase('hls', useCase)) return null;

    return { renderer: 'hls', label: 'HLS' };
  }

  if (ext === '.mpd') {
    if (!isRendererValidForUseCase('dash', useCase)) return null;

    return { renderer: 'dash', label: 'DASH' };
  }

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
  return getInstallationPreset(useCase).renderers.includes(renderer);
}

const RENDERER_ARTICLES: Record<Renderer, 'a' | 'an'> = {
  'background-video': 'a',
  cloudflare: 'a',
  dash: 'a',
  hls: 'an',
  'html5-audio': 'an',
  'html5-video': 'an',
  'mux-audio': 'a',
  'mux-video': 'a',
  spotify: 'a',
  tiktok: 'a',
  twitch: 'a',
  vimeo: 'a',
  youtube: 'a',
};

export function articleFor(renderer: Renderer): 'a' | 'an' {
  return RENDERER_ARTICLES[renderer];
}
