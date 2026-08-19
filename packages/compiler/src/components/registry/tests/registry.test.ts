import { describe, expect, it } from 'vitest';
import { defineComponent, defineComponents } from '../../definition';
import { defineRegistry, defineTarget, extendRegistry, isTargetComponent, REGISTRY_TARGET } from '../index';

const components = defineComponents('@fixture/components', {
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
  it('binds typed component definitions to generated target hosts', () => {
    const targets = fixtureTargets();
    const registry = defineRegistry({
      components,
      targets: {
        PlayButton: targets.PlayButton,
        Tooltip: {
          parts: {
            Root: targets.Tooltip.Root,
            Trigger: {
              host: targets.Tooltip.Trigger,
              render: () => null,
            },
            Popup: targets.Tooltip.Popup,
          },
        },
      },
    });

    const binding = registry.bindings[0]!;
    const tooltip = binding.targets.Tooltip as {
      parts: { Root: unknown; Trigger: { host: unknown } };
    };

    expect(binding.components).toBe(components);
    expect(isTargetComponent(binding.targets.PlayButton)).toBe(true);
    expect(isTargetComponent(tooltip.parts.Root)).toBe(true);
    expect(tooltip.parts.Trigger.host).toBe(targets.Tooltip.Trigger);
    expect(targets.Tooltip.Popup[REGISTRY_TARGET]).toEqual({
      import: {
        from: '@fixture/react',
        name: 'Tooltip',
        path: ['Popup'],
      },
    });
  });

  it('extends a registry with another typed component binding', () => {
    const skinComponents = defineComponents('@fixture/skin-components', {
      Overlay: defineComponent({ name: 'Overlay' }),
    });
    const registry = extendRegistry(defineRegistry({ components, targets: fixtureTargets() }), {
      components: skinComponents,
      targets: {
        Overlay: defineTarget({ import: { from: '@fixture/react', name: 'Overlay' } }),
      },
    });

    expect(registry.bindings.map(({ components }) => components.source)).toEqual([
      '@fixture/components',
      '@fixture/skin-components',
    ]);
    expect(registry.primitives).toEqual({});
  });

  it('composes registry options with extension precedence', () => {
    const skinComponents = defineComponents('@fixture/skin-components', {
      Overlay: defineComponent({ name: 'Overlay' }),
    });
    const baseTransform = () => undefined;
    const extensionTransform = () => undefined;
    const Group = fixtureTarget('Group');
    const Text = fixtureTarget('Text');
    const base = defineRegistry({
      components,
      targets: fixtureTargets(),
      props: { transform: baseTransform },
      primitives: { Group },
      types: () => ({ from: '@fixture/react', name: 'BaseNode' }),
    });
    const registry = extendRegistry(base, {
      components: skinComponents,
      targets: {
        Overlay: defineTarget({ import: { from: '@fixture/react', name: 'Overlay' } }),
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

function fixtureTargets() {
  return {
    PlayButton: fixtureTarget('PlayButton'),
    Tooltip: {
      Root: fixtureTarget('Tooltip', 'Root'),
      Trigger: fixtureTarget('Tooltip', 'Trigger'),
      Popup: fixtureTarget('Tooltip', 'Popup'),
    },
  } as const;
}

function fixtureTarget(component: string, part?: string) {
  return defineTarget({
    import: {
      from: '@fixture/react',
      name: component,
      ...(part ? { path: [part] } : {}),
    },
  });
}
