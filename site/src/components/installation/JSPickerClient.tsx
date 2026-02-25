import { navigate } from 'astro:transitions/client';
import { Atom, Globe } from 'lucide-react';
import type { ReactNode } from 'react';
import ImageRadioGroup from '@/components/ImageRadioGroup';
import type { SupportedFramework, SupportedStyle } from '@/types/docs';
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
      const currentScrollY = window.scrollY;
      navigate(url, { history: 'replace' }).then(() => {
        window.scrollTo(0, currentScrollY);
      });
    } else {
      navigate(url);
    }
  };

  return (
    <ImageRadioGroup
      value={currentFramework}
      onChange={handleFrameworkChange}
      options={SUPPORTED_FRAMEWORKS.map((fw) => ({
        value: fw,
        label: FRAMEWORK_LABELS[fw],
        image: FRAMEWORK_IMAGES[fw],
      }))}
      aria-label="Select JS framework"
    />
  );
}
