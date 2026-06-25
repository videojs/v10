import type { SelectOption } from '@/components/Select';
import type { Renderer, UseCase } from '@/utils/installation/types';
import { VALID_RENDERERS } from '@/utils/installation/types';

export const RENDERER_LABELS: Record<Renderer, string> = {
  'background-video': 'Background Video',
  dash: 'DASH',
  hls: 'HLS',
  'html5-audio': 'HTML5 Audio',
  'html5-video': 'HTML5 Video',
  'mux-audio': 'Mux',
  'mux-video': 'Mux',
  vimeo: 'Vimeo',
};

export function buildOptions(useCase: UseCase): SelectOption<Renderer>[] {
  return VALID_RENDERERS[useCase].map((r) => ({
    value: r,
    label: RENDERER_LABELS[r],
  }));
}
