import type { SelectOption } from '@/components/Select';
import type { Renderer, UseCase } from '@/utils/installation/types';
import { getInstallationPreset } from '@/utils/installation/types';

export const RENDERER_LABELS: Record<Renderer, string> = {
  'background-video': 'Background Video',
  cloudflare: 'Cloudflare Stream',
  dash: 'DASH',
  hls: 'HLS',
  'html5-audio': 'HTML5 Audio',
  'html5-video': 'HTML5 Video',
  'mux-audio': 'Mux',
  'mux-video': 'Mux',
  spotify: 'Spotify',
  tiktok: 'TikTok',
  twitch: 'Twitch',
  vimeo: 'Vimeo',
  youtube: 'YouTube',
};

export function buildOptions(useCase: UseCase): SelectOption<Renderer>[] {
  return getInstallationPreset(useCase).renderers.map((r) => ({
    value: r,
    label: RENDERER_LABELS[r],
  }));
}
