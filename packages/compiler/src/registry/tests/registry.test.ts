import { describe, expect, it } from 'vitest';
import { defineComponent, defineSchema } from '../../components/definition';
import { defineRegistry, extendRegistry, type RegistryEntryReference } from '../index';

const schema = defineSchema('@fixture/components', {
  PlayButton: defineComponent({ name: 'PlayButton' }),
  Tooltip: defineComponent({
    name: 'Tooltip',
    root: 'Root',
    parts: {
      Root: defineComponent(),
      Trigger: defineComponent(),
      Popup: defineComponent(),
    },
  }),
});

describe('defineRegistry', () => {
  it('binds a typed component schema to registry entries', () => {
    const entries = fixtureEntries();
    const registry = defineRegistry({
      schema,
      entries: {
        PlayButton: entries.PlayButton,
        Tooltip: {
          parts: {
            Root: entries.Tooltip.Root,
            Trigger: {
              host: entries.Tooltip.Trigger,
              render: () => null,
            },
            Popup: entries.Tooltip.Popup,
          },
        },
      },
    });

    const binding = registry.bindings[0]!;
    const tooltip = binding.entries.Tooltip as {
      parts: { Root: unknown; Trigger: { host: unknown } };
    };

    expect(binding.schema).toBe(schema);
    expect(binding.entries.PlayButton).toBe(entries.PlayButton);
    expect(tooltip.parts.Root).toBe(entries.Tooltip.Root);
    expect(tooltip.parts.Trigger.host).toBe(entries.Tooltip.Trigger);
    expect(entries.Tooltip.Popup).toEqual({
      import: {
        from: '@fixture/react',
        name: 'Tooltip',
        path: ['Popup'],
      },
    });
  });

  it('extends a registry with another typed component binding', () => {
    const skinComponents = defineSchema('@fixture/skin-components', {
      Overlay: defineComponent({ name: 'Overlay' }),
    });
    const registry = extendRegistry(defineRegistry({ schema, entries: fixtureEntries() }), {
      schema: skinComponents,
      entries: {
        Overlay: { import: { from: '@fixture/react', name: 'Overlay' } },
      },
    });

    expect(registry.bindings.map(({ schema }) => schema.source)).toEqual([
      '@fixture/components',
      '@fixture/skin-components',
    ]);
    expect(registry.primitives).toEqual({});
  });

  it('composes registry options with extension precedence', () => {
    const skinComponents = defineSchema('@fixture/skin-components', {
      Overlay: defineComponent({ name: 'Overlay' }),
    });
    const baseTransform = () => undefined;
    const extensionTransform = () => undefined;
    const Group = fixtureEntry('Group');
    const Text = fixtureEntry('Text');
    const base = defineRegistry({
      schema,
      entries: fixtureEntries(),
      props: { transform: baseTransform },
      primitives: { Group },
      types: () => ({ from: '@fixture/react', name: 'BaseNode' }),
    });
    const registry = extendRegistry(base, {
      schema: skinComponents,
      entries: {
        Overlay: { import: { from: '@fixture/react', name: 'Overlay' } },
      },
      props: { transform: extensionTransform },
      primitives: { Text },
      types: () => ({ from: '@fixture/react', name: 'ExtensionNode' }),
    });

    expect(registry.props?.transform).toBe(extensionTransform);
    expect(registry.primitives).toEqual({ Group, Text });
    expect(registry.types?.('VjscNode')).toEqual({
      from: '@fixture/react',
      name: 'ExtensionNode',
    });
  });
});

function fixtureEntries() {
  return {
    PlayButton: fixtureEntry('PlayButton'),
    Tooltip: {
      Root: fixtureEntry('Tooltip', 'Root'),
      Trigger: fixtureEntry('Tooltip', 'Trigger'),
      Popup: fixtureEntry('Tooltip', 'Popup'),
    },
  } as const;
}

function fixtureEntry(component: string, part?: string): RegistryEntryReference {
  return {
    import: {
      from: '@fixture/react',
      name: component,
      ...(part ? { path: [part] } : {}),
    },
  };
}
