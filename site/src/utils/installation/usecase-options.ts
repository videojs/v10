import type { SelectOption } from '@/components/Select';
import type { UseCase } from '@/utils/installation/types';

export const USE_CASE_LABELS: Record<UseCase, string> = {
  'default-video': 'Video',
  'default-audio': 'Audio',
  'background-video': 'Background Video',
};

// Order doubles as guidance: video first as the common case, then audio, then
// the background-video special case. Mirrors the UI radio group and CLI prompt.
const USE_CASE_ORDER: UseCase[] = ['default-video', 'default-audio', 'background-video'];

export function buildOptions(): SelectOption<UseCase>[] {
  return USE_CASE_ORDER.map((value) => ({ value, label: USE_CASE_LABELS[value] }));
}
