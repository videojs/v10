import type { SchemaEntryResolver } from 'vjsc';
import type { RegistryEntryReference, RegistryPropsReference } from 'vjsc/registry';

type ReactEntryReference = RegistryEntryReference & {
  readonly props: RegistryPropsReference;
};

/** Map one canonical component or part to its public React package entry. */
export const resolveReactEntry: SchemaEntryResolver<ReactEntryReference> = ({ component, part }) => {
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
};
