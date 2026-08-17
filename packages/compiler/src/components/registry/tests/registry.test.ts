import { describe, expect, it } from 'vitest';
import { defineComponent, defineComponents } from '../../definition';
import { defineRegistry, defineTarget, Host, isHost, isTargetComponent, REGISTRY_TARGET } from '../index';

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

    expect(registry.components).toBe(components);
    expect(isTargetComponent(registry.entries.PlayButton)).toBe(true);
    expect('parts' in registry.entries.Tooltip && isHost(registry.entries.Tooltip.parts.Root)).toBe(true);
    expect(targets.Tooltip.Popup[REGISTRY_TARGET]).toEqual({
      import: {
        from: '@fixture/react',
        name: 'Tooltip',
        path: ['Popup'],
      },
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
