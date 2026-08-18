import { describe, expect, it } from 'vitest';
import { defineComponent, defineComponents } from '../../definition';
import {
  defineRegistry,
  defineTarget,
  extendRegistry,
  Host,
  isHost,
  isTargetComponent,
  REGISTRY_TARGET,
} from '../index';

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
    const registry = defineRegistry(components, {
      PlayButton: targets.PlayButton,
      Tooltip: {
        host: targets.Tooltip,
        parts: {
          Root: Host,
          Trigger: Host,
          Popup: Host,
        },
      },
    });

    const binding = registry.bindings[0]!;
    const tooltip = binding.entries.Tooltip as { parts: { Root: unknown } };

    expect(binding.components).toBe(components);
    expect(isTargetComponent(binding.entries.PlayButton)).toBe(true);
    expect(isHost(tooltip.parts.Root)).toBe(true);
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
    const registry = extendRegistry(defineRegistry(components, fixtureTargets()), skinComponents, {
      Overlay: defineTarget({ import: { from: '@fixture/react', name: 'Overlay' } }),
    });

    expect(registry.bindings.map(({ components }) => components.source)).toEqual([
      '@fixture/components',
      '@fixture/skin-components',
    ]);
    expect(registry.primitives).toEqual({});
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
