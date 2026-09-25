import type { UseCase } from './presets';
import { getInstallationPreset } from './presets';
import { getInstallationRenderer, type Renderer } from './renderers';

export interface DetectionResult {
  renderer: Renderer;
  label: string;
}

const DOMAIN_RULES: Array<{ match: (hostname: string) => boolean; renderer: Renderer }> = [
  {
    match: (h) => h === 'vimeo.com' || h === 'www.vimeo.com' || h === 'player.vimeo.com',
    renderer: 'vimeo',
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
  },
  {
    match: (h) => h === 'open.spotify.com',
    renderer: 'spotify',
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
  },
  {
    // `vm.tiktok.com` is deliberately absent: those short links carry an opaque
    // code instead of the numeric video id the media needs, and resolving one
    // takes an HTTP redirect the picker can't follow.
    match: (h) => h === 'tiktok.com' || h === 'www.tiktok.com',
    renderer: 'tiktok',
  },
  {
    // `clips.twitch.tv` is deliberately absent: clips are a different embed
    // the Twitch media element cannot play.
    match: (h) => h === 'twitch.tv' || h === 'www.twitch.tv' || h === 'go.twitch.tv',
    renderer: 'twitch',
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

const MUX_HOSTNAMES = new Set(['stream.mux.com', 'mux.com', 'www.mux.com']);
// Candidate order lets the selected use case choose video, audio, or background playback.
const MUX_RENDERERS = ['mux-video', 'mux-audio', 'mux-background-video'] as const satisfies readonly Renderer[];

const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.ogv']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac']);

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

/** Renderers whose accepted source shape matches a URL, ordered from provider-specific to generic. */
export function detectRendererCandidates(url: string): readonly Renderer[] {
  const trimmed = url.trim();
  if (!trimmed) return [];

  const parsed = parseUrl(trimmed);
  if (!parsed) return [];

  const ext = getExtension(parsed.pathname);
  // A Mux playback URL (`<id>.m3u8` or a bare playback ID) wins over generic HLS so it gets Mux Data. Static
  // renditions such as `<id>/highest.mp4` or `<id>/audio.m4a` are plain files that the Mux media cannot play.
  const muxPlayback = MUX_HOSTNAMES.has(parsed.hostname) && (ext === '' || ext === '.m3u8');
  const renderers: Renderer[] = [
    ...(muxPlayback ? MUX_RENDERERS : []),
    ...DOMAIN_RULES.filter((rule) => rule.match(parsed.hostname)).map(({ renderer }) => renderer),
  ];

  if (ext === '.m3u8') {
    renderers.push('hls', 'hls-background-video');
  } else if (ext === '.mpd') {
    renderers.push('dash');
  } else if (VIDEO_EXTENSIONS.has(ext)) {
    renderers.push('html5-video', 'background-video');
  } else if (AUDIO_EXTENSIONS.has(ext)) {
    renderers.push('html5-audio');
  }

  return [...new Set(renderers)];
}

export function detectRenderer(url: string, useCase: UseCase): DetectionResult | null {
  const renderer = detectRendererCandidates(url).find((candidate) => isRendererValidForUseCase(candidate, useCase));
  if (!renderer) return null;

  return { renderer, label: getInstallationRenderer(renderer).label };
}

export function isRendererValidForUseCase(renderer: Renderer, useCase: UseCase): boolean {
  return getInstallationPreset(useCase).renderers.includes(renderer);
}

export function articleFor(renderer: Renderer): 'a' | 'an' {
  return getInstallationRenderer(renderer).article;
}
