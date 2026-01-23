import { Select } from '@/components/Select';
import type { AnySupportedStyle, SupportedFramework, SupportedStyle } from '@/types/docs';
import {
  FRAMEWORK_LABELS,
  FRAMEWORK_STYLES,
  isValidFramework,
  isValidStyleForFramework,
  STYLE_LABELS,
  SUPPORTED_FRAMEWORKS,
} from '@/types/docs';
import { resolveFrameworkChange, resolveStyleChange } from '@/utils/docs/routing';

interface SelectorProps<T extends SupportedFramework> {
  currentFramework: T;
  currentStyle: SupportedStyle<T>;
  currentSlug: string;
}

export function Selectors({ currentFramework, currentStyle, currentSlug }: SelectorProps<SupportedFramework>) {
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

  const frameworkOptions = SUPPORTED_FRAMEWORKS.map((fw) => ({
    value: fw,
    label: FRAMEWORK_LABELS[fw],
  }));

  const styleOptions = availableStyles.map((st) => ({
    value: st,
    label: STYLE_LABELS[st],
  }));

  return (
    // we switch to py-2.5 for a short time to match the table of contents in the body
    <div className="px-6 pb-6 pt-2.5 lg:py-2.5 xl:p-6 border-b border-light-40 dark:border-dark-80">
      <div
        className="max-w-3xl mx-auto w-full grid grid-flow-col grid-cols-2 grid-rows-2 gap-x-2 lg:grid-flow-row lg:grid-cols-(--lg-grid-cols) lg:gap-x-6 lg:gap-y-2 items-center"
        style={{ '--lg-grid-cols': 'auto minmax(0, 1fr)' } as React.CSSProperties}
      >
        <span>Framework</span>
        <Select
          value={currentFramework}
          onChange={handleFrameworkChange}
          options={frameworkOptions}
          aria-label="Select framework"
          data-testid="select-framework"
        />
        <span>Style</span>
        <Select
          value={currentStyle}
          onChange={handleStyleChange}
          options={styleOptions}
          aria-label="Select style"
          data-testid="select-style"
        />
      </div>
    </div>
  );
}
