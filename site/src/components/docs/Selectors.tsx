import { useStore } from '@nanostores/react';
import type { ReactNode } from 'react';

import Css3Logo from '@/assets/logos/brands/css3.svg?react';
import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import SegmentedControl from '@/components/SegmentedControl';
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
import useIsHydrated from '@/utils/useIsHydrated';

const FRAMEWORK_ICONS = {
  react: <ReactLogo className="size-4" />,
  html: <Html5Logo className="size-4" />,
} satisfies Record<SupportedFramework, ReactNode>;

const STYLE_ICONS = {
  css: <Css3Logo className="size-4" />,
} satisfies Record<AnySupportedStyle, ReactNode>;

interface SelectorProps {
  currentFramework: SupportedFramework;
  currentSlug: string;
  className?: string;
}

export function Selectors({ currentFramework, currentSlug, className }: SelectorProps) {
  const currentStyle = useStore(styleStore);
  const isHydrated = useIsHydrated();
  const hydrationSafeCurrentStyle = isHydrated ? currentStyle : null;

  const handleFrameworkChange = (newFramework: SupportedFramework) => {
    if (!isValidFramework(newFramework) || newFramework === currentFramework) return;

    const { url, shouldReplace } = resolveFrameworkChange({
      currentFramework,
      currentSlug,
      newFramework,
    });

    if (shouldReplace) {
      // Base UI's scroll lock transfers html.scrollTop → body.scrollTop
      const scrollLocked = document.documentElement.hasAttribute('data-base-ui-scroll-locked');
      const scrollY = scrollLocked ? document.body.scrollTop : window.scrollY;

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

  const handleStyleChange = (newStyle: AnySupportedStyle) => {
    if (!isValidStyleForFramework(currentFramework, newStyle)) return;

    // Update localStorage for this framework
    setStylePreferenceClient(currentFramework, newStyle);
    // Update DOM attribute
    updateStyleAttribute(newStyle);
    // Update nanostore for React components
    styleStore.set(newStyle);
  };

  const frameworkOptions = SUPPORTED_FRAMEWORKS.map((fw) => ({
    value: fw,
    label: FRAMEWORK_LABELS[fw],
    icon: FRAMEWORK_ICONS[fw],
  }));

  const styleOptions = FRAMEWORK_STYLES[currentFramework].map((st) => ({
    value: st,
    label: STYLE_LABELS[st],
    icon: STYLE_ICONS[st],
  }));

  return (
    <div className={className ?? 'border-line border-b px-6 py-5'}>
      <div className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2 md:grid-cols-1">
        <div className="grid gap-1.5">
          <SegmentedControl
            value={currentFramework}
            onChange={handleFrameworkChange}
            options={frameworkOptions}
            aria-label="Select framework"
            data-testid="select-framework"
          />
        </div>
        <div className="grid gap-1.5">
          <SegmentedControl
            value={hydrationSafeCurrentStyle}
            onChange={handleStyleChange}
            options={styleOptions}
            aria-label="Select style"
            data-testid="select-style"
            disabled={!isHydrated}
          />
        </div>
      </div>
    </div>
  );
}
