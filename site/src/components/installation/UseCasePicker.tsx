import { useStore } from '@nanostores/react';
import type { ReactNode } from 'react';

import Film from '@/assets/icons/film.svg?react';
import Image from '@/assets/icons/image.svg?react';
import LiveStreaming from '@/assets/icons/live-streaming.svg?react';
import MusicNote from '@/assets/icons/music-note.svg?react';
import Radio from '@/assets/icons/radio.svg?react';
import CardRadioGroup from '@/components/CardRadioGroup';
import { useCase } from '@/stores/installation';
import { getInstallationPreset, USE_CASES, type UseCase } from '@/utils/installation/types';

const USE_CASE_MEDIA: Record<UseCase, ReactNode> = {
  'default-video': <Film className="size-6" />,
  'default-audio': <MusicNote className="size-6" />,
  'live-video': <LiveStreaming className="size-6" />,
  'live-audio': <Radio className="size-6" />,
  'background-video': <Image className="size-6" />,
};

const USE_CASE_DESCRIPTIONS: Record<UseCase, string> = {
  'default-video': 'On-demand video with full controls',
  'default-audio': 'Podcasts, music, and audio-only playback',
  'live-video': 'Streams with a Live button, no duration',
  'live-audio': 'Live radio and audio streams',
  'background-video': 'Muted, looping video behind your content',
};

export default function UseCasePicker() {
  const $useCase = useStore(useCase);

  return (
    <CardRadioGroup
      value={$useCase}
      onChange={(value) => useCase.set(value)}
      options={USE_CASES.map((value) => ({
        value,
        label: getInstallationPreset(value).label,
        description: USE_CASE_DESCRIPTIONS[value],
        media: USE_CASE_MEDIA[value],
      }))}
      aria-label="Select use case"
      minColumnWidth="10rem"
    />
  );
}
