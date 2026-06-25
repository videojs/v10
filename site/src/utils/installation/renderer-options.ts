import type { SelectGroup, SelectOption } from '@/components/Select';
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

// Sections teach the source-type taxonomy at the point of choice: plain files,
// then open streaming formats, then hosting services. Renderers absent here
// (e.g. background-video) fall back to an ungrouped list.
const RENDERER_SECTIONS: Array<{ label: string; renderers: Renderer[] }> = [
  { label: 'Files', renderers: ['html5-video', 'html5-audio'] },
  { label: 'Streaming formats', renderers: ['hls', 'dash'] },
  { label: 'Hosting services', renderers: ['mux-video', 'mux-audio', 'vimeo'] },
];

export function buildOptions(useCase: UseCase): SelectOption<Renderer>[] {
  return VALID_RENDERERS[useCase].map((r) => ({
    value: r,
    label: RENDERER_LABELS[r],
  }));
}

// Build labelled sections for the use case, dropping empty ones. Returns null
// unless grouping actually earns its keep — there must be at least two sections
// and at least one with more than one item. That keeps single-item use cases
// (background) and all-single-item ones (audio: HTML5 Audio + Mux) flat rather
// than stacking lone headers over lone items; the caller renders a flat list.
export function buildGroups(useCase: UseCase): SelectGroup<Renderer>[] | null {
  const valid = VALID_RENDERERS[useCase];
  const groups = RENDERER_SECTIONS.map((section) => ({
    label: section.label,
    options: section.renderers.filter((r) => valid.includes(r)).map((r) => ({ value: r, label: RENDERER_LABELS[r] })),
  })).filter((group) => group.options.length > 0);

  const worthGrouping = groups.length > 1 && groups.some((group) => group.options.length > 1);
  return worthGrouping ? groups : null;
}
