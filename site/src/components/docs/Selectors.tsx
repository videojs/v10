import { useStore } from '@nanostores/react';
import type { ReactNode } from 'react';

import Css3Logo from '@/assets/logos/brands/css3.svg?react';
import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import TailwindLogo from '@/assets/logos/brands/tailwindcss.svg?react';
import { Select, type SelectOption } from '@/components/Select';
import { currentStyle as styleStore } from '@/stores/preferences';
import type { AnySupportedStyle, SupportedFramework } from '@/types/docs';
import {
  FRAMEWORK_LABELS,
  FRAMEWORK_STYLES,
  getDefaultStyle,
  isValidFramework,
  isValidStyleForFramework,
  STYLE_LABELS,
  SUPPORTED_FRAMEWORKS,
} from '@/types/docs';
import { setStylePreferenceClient, updateStyleAttribute } from '@/utils/docs/preferences';
import { resolveFrameworkChange } from '@/utils/docs/routing';

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

  // The store is empty on the server and on the client's first render alike, so both fall back to the framework's
  // default style. That keeps the markup identical through hydration and stops the trigger flashing empty on every
  // page load; PreferenceUpdater then swaps in the stored choice if it differs.
  const displayedStyle = currentStyle ?? getDefaultStyle(currentFramework);

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

  // Tailwind skins are on the roadmap; the disabled entry tells readers the styling axis exists without linking anywhere.
  const styleOptions: SelectOption<AnySupportedStyle | 'tailwind'>[] = [
    ...FRAMEWORK_STYLES[currentFramework].map((st) => ({
      value: st,
      label: STYLE_LABELS[st],
      icon: STYLE_ICONS[st],
    })),
    { value: 'tailwind', label: 'Tailwind (coming soon)', icon: <TailwindLogo className="size-4" />, disabled: true },
  ];

  return (
    <div className={className ?? 'border-line border-b px-6 py-5'}>
      <div className="mx-auto grid w-full max-w-3xl gap-4 sm:grid-cols-2 md:grid-cols-1">
        <div className="grid gap-1.5">
          <Select
            value={currentFramework}
            onChange={(next) => next && handleFrameworkChange(next)}
            options={frameworkOptions}
            aria-label="Select framework"
            data-testid="select-framework"
            className="w-full"
          />
        </div>
        <div className="grid gap-1.5">
          <Select
            value={displayedStyle}
            onChange={(next) => next && next !== 'tailwind' && handleStyleChange(next)}
            options={styleOptions}
            aria-label="Select style"
            data-testid="select-style"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
