import { useStore } from '@nanostores/react';
import { Select } from '@/components/Select';
import { currentStyle as styleStore } from '@/stores/preferences';
import type { AnySupportedStyle, SupportedFramework } from '@/types/docs';
import { FRAMEWORK_STYLES, isValidFramework, isValidStyleForFramework, SUPPORTED_FRAMEWORKS } from '@/types/docs';
import { setStylePreferenceClient, updateStyleAttribute } from '@/utils/docs/preferences';
import { resolveFrameworkChange } from '@/utils/docs/routing';

interface SelectorProps {
  currentFramework: SupportedFramework;
  currentSlug: string;
}

export function Selectors({ currentFramework, currentSlug }: SelectorProps) {
  // Read style from nanostore (StyleInit + PreferenceUpdater guarantee a valid value)
  // Guard against React hydrating before style is initialized
  const currentStyle = useStore(styleStore);
  if (!currentStyle) return null;

  const handleFrameworkChange = (newFramework: SupportedFramework | null) => {
    if (newFramework === null) return;
    if (!isValidFramework(newFramework)) return;

    const { url, shouldReplace } = resolveFrameworkChange({
      currentFramework,
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

    // Update localStorage for this framework
    setStylePreferenceClient(currentFramework, newStyle);
    // Update DOM attribute
    updateStyleAttribute(newStyle);
    // Update nanostore for React components
    styleStore.set(newStyle);
  };

  const availableStyles = FRAMEWORK_STYLES[currentFramework];

  const frameworkOptions = SUPPORTED_FRAMEWORKS.map((fw) => ({
    value: fw,
    label: fw,
  }));

  const styleOptions = availableStyles.map((st) => ({
    value: st,
    label: st,
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
