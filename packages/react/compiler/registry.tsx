/** @jsxRuntime automatic */
/** @jsxImportSource @videojs/compiler/components/registry */

import { type ComponentRegistry, defineRegistry, defineTarget, Host } from '@videojs/compiler/components';
import { components } from '@videojs/core/components';
import { targets } from './components.generated';

const Div = defineTarget({ tagName: 'div' });
const SliderThumbnail = defineTarget({
  import: {
    from: '@videojs/react',
    name: 'Slider',
    path: ['Thumbnail'],
  },
});

/** Canonical core components rendered through the React component package. */
export const registry: ComponentRegistry = defineRegistry(components, {
  ...targets,

  Popover: {
    host: targets.Popover,
    parts: {
      ...targets.Popover,
      Trigger: ({ props, children }) => <Host {...props} render={children} />,
    },
  },

  Slider: {
    ...targets.Slider,
    Thumbnail: {
      Root: Div,
      Image: SliderThumbnail,
    },
  },

  Tooltip: {
    host: targets.Tooltip,
    parts: {
      ...targets.Tooltip,
      Trigger: ({ props, children }) => <Host {...props} render={children} />,
    },
  },
});
