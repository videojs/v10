import { useStore } from '@nanostores/react';
import { Box } from 'lucide-react';
import { useEffect } from 'react';
import type { ImageRadioOption } from '@/components/ImageRadioGroup';
import ImageRadioGroup from '@/components/ImageRadioGroup';
import type { Renderer } from '@/stores/installation';
import { renderer, useCase } from '@/stores/installation';

const VIDEO_RENDERERS: ImageRadioOption<Renderer>[] = [
  { value: 'html5-video', label: 'HTML5 Video', image: <Box size={16} /> },
  ...(
    [
      { value: 'cloudflare', label: 'Cloudflare', image: <Box size={16} /> },
      { value: 'dash', label: 'DASH', image: <Box size={16} /> },
      { value: 'hls', label: 'HLS', image: <Box size={16} /> },
      { value: 'jwplayer', label: 'JW Player', image: <Box size={16} /> },
      { value: 'mux-video', label: 'Mux', image: <Box size={16} /> },
      // { value: 'shaka', label: 'Shaka', image: <Box size={16} /> },
      { value: 'vimeo', label: 'Vimeo', image: <Box size={16} /> },
      { value: 'wistia', label: 'Wistia', image: <Box size={16} /> },
      { value: 'youtube', label: 'YouTube', image: <Box size={16} /> },
    ] satisfies ImageRadioOption<Renderer>[]
  ).sort((a, b) => a.label.localeCompare(b.label)),
];

const AUDIO_RENDERERS: ImageRadioOption<Renderer>[] = [
  { value: 'html5-audio', label: 'HTML5 Audio', image: <Box size={16} /> },
  { value: 'mux-audio', label: 'Mux', image: <Box size={16} /> },
  { value: 'spotify', label: 'Spotify', image: <Box size={16} /> },
];

const BACKGROUND_VIDEO_RENDERERS: ImageRadioOption<Renderer>[] = [
  { value: 'background-video', label: 'Background Video', image: <Box size={16} /> },
  { value: 'mux-background-video', label: 'Mux Background Video', image: <Box size={16} /> },
];

/** URL input and renderer dropdown for manual selection */
export default function RendererSelect() {
  const $renderer = useStore(renderer);
  const $useCase = useStore(useCase);

  const options =
    $useCase === 'default-audio'
      ? AUDIO_RENDERERS
      : $useCase === 'background-video'
        ? BACKGROUND_VIDEO_RENDERERS
        : VIDEO_RENDERERS;

  // Auto-switch renderer when use case changes and current renderer is invalid
  useEffect(() => {
    const validValues = options.map((o) => o.value);
    if (!validValues.includes($renderer)) {
      renderer.set(options[0].value);
    }
  }, [$useCase]);

  return (
    <ImageRadioGroup
      value={$renderer}
      onChange={(value) => renderer.set(value)}
      options={options}
      aria-label="Select renderer"
      size="sm"
      labelPosition="inline"
    />
  );
}
