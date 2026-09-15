import Html5Logo from '@/assets/logos/brands/html5.svg?react';
import ReactLogo from '@/assets/logos/brands/react.svg?react';
import SvelteLogo from '@/assets/logos/brands/svelte.svg?react';
import VueLogo from '@/assets/logos/brands/vue.svg?react';
import CardRadioGroup, { type CardRadioOption } from '@/components/CardRadioGroup';
import type { SupportedFramework } from '@/types/docs';
import { isValidFramework } from '@/types/docs';
import { buildDocsUrl, resolveFrameworkChange } from '@/utils/docs/routing';

/**
 * Frameworks the installation flow can start from. React and HTML switch the docs framework; Vue and Svelte open their
 * own installation pages, which build on the HTML custom elements.
 */
type PickerFramework = SupportedFramework | 'vue' | 'svelte';

const INSTALL_PAGE_SLUGS: Record<'vue' | 'svelte', string> = {
  vue: 'guides/installation-vue',
  svelte: 'guides/installation-svelte',
};

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

    if (next === 'vue' || next === 'svelte') {
      window.location.href = buildDocsUrl('html', INSTALL_PAGE_SLUGS[next]);
      return;
    }

    if (!isValidFramework(next)) return;

    // Leaving a Vue or Svelte page: land on the main installation page for the chosen framework.
    if (selected === 'vue' || selected === 'svelte') {
      window.location.href = buildDocsUrl(next, 'guides/installation');
      return;
    }

    const { url, shouldReplace } = resolveFrameworkChange({
      currentFramework,
      currentSlug,
      newFramework: next,
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

  return <CardRadioGroup value={selected} onChange={handleChange} options={OPTIONS} aria-label="Select JS framework" />;
}
