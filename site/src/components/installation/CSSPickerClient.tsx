import { Palette } from 'lucide-react';
import type { ReactNode } from 'react';
import ImageRadioGroup from '@/components/ImageRadioGroup';
import type { AnySupportedStyle, SupportedFramework, SupportedStyle } from '@/types/docs';
import { FRAMEWORK_STYLES, isValidStyleForFramework, STYLE_LABELS } from '@/types/docs';
import { resolveStyleChange } from '@/utils/docs/routing';

const STYLE_IMAGES: Record<AnySupportedStyle, ReactNode> = {
  css: <Palette size={32} />,
};

interface Props {
  currentFramework: SupportedFramework;
  currentStyle: SupportedStyle<SupportedFramework>;
  currentSlug: string;
}

export default function CSSPickerClient({ currentFramework, currentStyle, currentSlug }: Props) {
  // TODO: use astro view transitions to preserve scroll position when switching from the same slug to the same slug
  const handleStyleChange = (newStyle: AnySupportedStyle | null) => {
    if (newStyle === null) return;
    if (!isValidStyleForFramework(currentFramework, newStyle)) return;

    const { url, shouldReplace } = resolveStyleChange({
      currentFramework,
      currentStyle,
      currentSlug,
      newStyle,
    });

    if (shouldReplace) {
      // Maintaining the current slug, navigate without pushing onto the history stack
      window.location.replace(url);
    } else {
      // Changing slug, use normal navigation
      window.location.href = url;
    }
  };

  const availableStyles = FRAMEWORK_STYLES[currentFramework];

  return (
    <ImageRadioGroup
      value={currentStyle}
      onChange={handleStyleChange}
      options={availableStyles.map((st) => ({
        value: st,
        label: STYLE_LABELS[st],
        image: STYLE_IMAGES[st],
      }))}
      aria-label="Select style"
    />
  );
}
