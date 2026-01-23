import type { ReactNode } from 'react';
import type { SupportedFramework, SupportedStyle } from '@/types/docs';

import { Atom, Globe } from 'lucide-react';

import ImageRadioGroup from '@/components/ImageRadioGroup';
import { FRAMEWORK_LABELS, isValidFramework, SUPPORTED_FRAMEWORKS } from '@/types/docs';
import { resolveFrameworkChange } from '@/utils/docs/routing';

const FRAMEWORK_IMAGES: Record<SupportedFramework, ReactNode> = {
  react: <Atom size={32} />,
  html: <Globe size={32} />,
};

interface Props {
  currentFramework: SupportedFramework;
  currentStyle: SupportedStyle<SupportedFramework>;
  currentSlug: string;
}

export default function JSPickerClient({ currentFramework, currentStyle, currentSlug }: Props) {
  // TODO: use astro view transitions to preserve scroll position when switching from the same slug to the same slug
  const handleFrameworkChange = (newFramework: SupportedFramework | null) => {
    if (newFramework === null) return;
    if (!isValidFramework(newFramework)) return;

    const { url, shouldReplace } = resolveFrameworkChange({
      currentFramework,
      currentStyle,
      currentSlug,
      newFramework,
    });

    if (shouldReplace) {
      // Maintaining the current slug, navigate without pushing onto the history stack
      window.location.replace(url);
    } else {
      // Changing slug, use normal navigation
      window.location.href = url;
    }
  };

  return (
    <ImageRadioGroup
      value={currentFramework}
      onChange={handleFrameworkChange}
      options={SUPPORTED_FRAMEWORKS.map(fw => ({
        value: fw,
        label: FRAMEWORK_LABELS[fw],
        image: FRAMEWORK_IMAGES[fw],
      }))}
      aria-label="Select JS framework"
    />
  );
}
