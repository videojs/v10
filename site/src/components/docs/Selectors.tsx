import { useStore } from '@nanostores/react';
import { Select } from '@/components/Select';
import { currentStyle as styleStore } from '@/stores/preferences';
import type { AnySupportedStyle, SupportedFramework } from '@/types/docs';
import {
  FRAMEWORK_LABELS,
  FRAMEWORK_STYLES,
  isValidFramework,
  isValidStyleForFramework,
  STYLE_LABELS,
  SUPPORTED_FRAMEWORKS,
} from '@/types/docs';
import { setStylePreferenceClient, updateStyleAttribute } from '@/utils/docs/preferences';
import { resolveFrameworkChange } from '@/utils/docs/routing';

interface SelectorProps {
  currentFramework: SupportedFramework;
  currentSlug: string;
}

/** Read the style from the DOM attribute set by StyleInit (runs before paint). */
function getInitialStyle(framework: SupportedFramework): AnySupportedStyle {
  if (typeof document !== 'undefined') {
    const domStyle = document.documentElement.dataset.style;
    if (domStyle && isValidStyleForFramework(framework, domStyle)) {
      return domStyle as AnySupportedStyle;
    }
  }
  return FRAMEWORK_STYLES[framework][0];
}

export function Selectors({ currentFramework, currentSlug }: SelectorProps) {
  const currentStyle = useStore(styleStore);

  // Use nanostore value when available, otherwise read from DOM (set by StyleInit before paint)
  const resolvedStyle = currentStyle ?? getInitialStyle(currentFramework);

  const handleFrameworkChange = (newFramework: SupportedFramework | null) => {
    if (newFramework === null) return;
    if (!isValidFramework(newFramework)) return;

    const { url, shouldReplace } = resolveFrameworkChange({
      currentFramework,
      currentSlug,
      newFramework,
    });

    // Base UI's scroll lock transfers html.scrollTop → body.scrollTop.
    // Capture scroll position before releasing the lock.
    const scrollLocked = document.documentElement.hasAttribute('data-base-ui-scroll-locked');
    const scrollY = scrollLocked ? document.body.scrollTop : window.scrollY;

    // Release scroll lock before navigating so the page doesn't appear frozen
    if (scrollLocked) {
      document.documentElement.removeAttribute('data-base-ui-scroll-locked');
      document.documentElement.style.overflow = '';
    }

    if (shouldReplace) {
      try {
        sessionStorage.setItem(
          'vjs-page-scroll',
          JSON.stringify({ url: new URL(url, window.location.origin).pathname, scrollY })
        );
      } catch {
        // Ignore storage errors
      }
      window.location.replace(url);
    } else {
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
    label: FRAMEWORK_LABELS[fw],
  }));

  const styleOptions = availableStyles.map((st) => ({
    value: st,
    label: STYLE_LABELS[st],
  }));

  return (
    <div className="px-6 pb-6 pt-2.5 md:py-6 xl:p-6 border-b border-manila-75 dark:border-faded-black">
      <div
        className="max-w-3xl mx-auto w-full grid grid-flow-col grid-cols-2 grid-rows-2 gap-x-2 md:grid-flow-row md:grid-cols-(--md-grid-cols) md:gap-x-6 md:gap-y-2 items-center"
        style={{ '--md-grid-cols': 'auto minmax(0, 1fr)' } as React.CSSProperties}
      >
        <span className="text-p3 text-faded-black dark:text-manila-light">Framework</span>
        <Select
          value={currentFramework}
          onChange={handleFrameworkChange}
          options={frameworkOptions}
          aria-label="Select framework"
          data-testid="select-framework"
        />
        <span className="text-p3 text-faded-black dark:text-manila-light">Style</span>
        <Select
          value={resolvedStyle}
          onChange={handleStyleChange}
          options={styleOptions}
          aria-label="Select style"
          data-testid="select-style"
        />
      </div>
    </div>
  );
}
