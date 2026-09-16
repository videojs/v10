import schema from '@videojs/core/vjsc';
import type { ComponentType, ExoticComponent } from 'react';
import { describe, expect, it } from 'vite-plus/test';

import * as primitives from '../skin-primitives';

/** The shape of a schema component or part this test reads; the full definition type lives in `vjsc/components`. */
interface PartDefinition {
  readonly parts?: Readonly<Record<string, PartDefinition>> | undefined;
  readonly element?: boolean | undefined;
}

interface SchemaPart {
  readonly path: string;
  readonly definition: PartDefinition;
}

/** Every component and part the schema declares, flattened to dotted paths such as `Menu.Trigger`. */
function schemaParts(): SchemaPart[] {
  const collected: SchemaPart[] = [];

  const visit = (path: string, definition: PartDefinition) => {
    if (!definition.parts) {
      collected.push({ path, definition });
      return;
    }

    for (const [name, part] of Object.entries(definition.parts)) visit(`${path}.${name}`, part);
  };

  for (const [name, definition] of Object.entries(schema.definitions)) visit(name, definition);

  return collected;
}

/** A component the facade exposes, or a module namespace of a compound component's parts. */
type Primitive = ComponentType<object> | ExoticComponent<object> | PrimitiveNamespace;

interface PrimitiveNamespace {
  readonly [part: string]: Primitive | undefined;
}

// SAFETY: the facade only re-exports components and `export * as` part namespaces; type-only exports are erased.
const facade = primitives as PrimitiveNamespace;

function isNamespace(value: Primitive): value is PrimitiveNamespace {
  return Symbol.toStringTag in value && value[Symbol.toStringTag] === 'Module';
}

function resolvePrimitive(path: string): Primitive | undefined {
  let value: Primitive | undefined = facade;

  for (const segment of path.split('.')) value = value && isNamespace(value) ? value[segment] : undefined;

  return value;
}

function forwardsRef(component: Primitive): boolean {
  return '$$typeof' in component && component.$$typeof === Symbol.for('react.forward_ref');
}

describe('skin-primitives', () => {
  const exposed = schemaParts().flatMap(({ path, definition }) => {
    const primitive = resolvePrimitive(path);

    return primitive ? [{ path, definition, primitive }] : [];
  });

  // The skin compiler wraps authored components in `forwardRef` whenever their props land on a part the schema says
  // owns an element, so every such part must forward its ref to that element, and no element-less part may claim one.
  it.each(exposed)('forwards refs exactly when the schema gives $path an element', ({ definition, primitive }) => {
    expect(forwardsRef(primitive)).toBe(definition.element !== false);
  });
});
