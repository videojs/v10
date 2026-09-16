import { navigate } from 'astro:transitions/client';

import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import SvelteLogo from '@/assets/logos/brands/svelte.svg?react';
import VueLogo from '@/assets/logos/brands/vue.svg?react';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import type { SupportedFramework } from '@/types/docs';
import { isValidFramework } from '@/types/docs';
import { DOCS_FRAMEWORK_NAVIGATION_INFO } from '@/utils/docs/navigation';
import { buildDocsUrl, resolveFrameworkChange } from '@/utils/docs/routing';
import { savePageScrollForNavigation } from '@/utils/docs/scroll';

/**
 * Frameworks the installation flow can start from. React and HTML switch the docs framework; Vue and Svelte open their
 * own installation pages, which build on the HTML custom elements.
 */
type PickerFramework = SupportedFramework | 'vue' | 'svelte';

const INSTALL_PAGE_SLUGS = {
  vue: 'guides/installation-vue',
  svelte: 'guides/installation-svelte',
} satisfies Record<'vue' | 'svelte', string>;

const OPTIONS: CardRadioOption<PickerFramework>[] = [
  {
    value: 'react',
    label: 'React',
    description: 'Components and hooks for React 19',
    media: <ReactLogo className="size-7" />,
  },
  {
    value: 'html',
    label: 'HTML',
    description: 'Custom elements for any stack',
    media: <Html5Logo className="size-7" />,
  },
  {
    value: 'vue',
    label: 'Vue',
    description: 'Vue 3 and Nuxt, using the custom elements',
    media: <VueLogo className="size-7" />,
  },
  {
    value: 'svelte',
    label: 'Svelte',
    description: 'Svelte 5 and SvelteKit, using the custom elements',
    media: <SvelteLogo className="size-7" />,
  },
];

interface Props {
  currentFramework: SupportedFramework;
  currentSlug: string;
}

function pickerValue(currentFramework: SupportedFramework, currentSlug: string): PickerFramework {
  if (currentSlug === INSTALL_PAGE_SLUGS.vue) return 'vue';

  if (currentSlug === INSTALL_PAGE_SLUGS.svelte) return 'svelte';

  return currentFramework;
}

export default function JSPickerClient({ currentFramework, currentSlug }: Props) {
  const selected = pickerValue(currentFramework, currentSlug);

  const handleChange = (next: PickerFramework) => {
    if (next === selected) return;

    let url: string;
    let shouldReplace = false;

    if (next === 'vue' || next === 'svelte') {
      url = buildDocsUrl('html', INSTALL_PAGE_SLUGS[next]);
    } else {
      if (!isValidFramework(next)) return;

      // Leaving a Vue or Svelte page: land on the main installation page for the chosen framework.
      if (selected === 'vue' || selected === 'svelte') {
        url = buildDocsUrl(next, 'guides/installation');
      } else {
        const result = resolveFrameworkChange({
          currentFramework,
          currentSlug,
          newFramework: next,
        });

        url = result.url;
        shouldReplace = result.shouldReplace;
      }
    }

    savePageScrollForNavigation(url);

    if (shouldReplace) {
      // Same page, other framework: keep the query so installation picks survive the switch.
      const target = url + window.location.search;

      void navigate(target, { history: 'replace', info: DOCS_FRAMEWORK_NAVIGATION_INFO });
    } else {
      void navigate(url, { history: 'push', info: DOCS_FRAMEWORK_NAVIGATION_INFO });
    }
  };

  return <CardRadioGroup value={selected} onChange={handleChange} options={OPTIONS} aria-label="Select JS framework" />;
}
