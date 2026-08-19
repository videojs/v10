import { components } from '@videojs/core/vjsc';
import { defineConfig } from 'vjsc';

export default defineConfig({
  generate: {
    target: {
      components,
      output: './vjsc/components.generated.ts',

      resolve({ component, part }) {
        // React exposes Menu.SubmenuTrigger through Menu.Trigger.
        const path = part ? (part === 'SubmenuTrigger' ? 'Trigger' : part).split('.') : [];

        // Root components export Props; compound parts export names such as TriggerProps.
        const propsPath = path.length === 0 ? ['Props'] : [...path.slice(0, -1), `${path.at(-1)}Props`];

        return {
          import: {
            from: '@videojs/react',
            name: component,
            ...(path.length > 0 ? { path } : {}),
          },
          props: {
            from: '@videojs/react',
            name: component,
            path: propsPath,
          },
        };
      },
    },
  },
});
