// Utilities whose signatures exercise type-fidelity rules: private aliases, grouping, defaults, and display hints.

import type { Engine } from './engine';

type Entry<T extends string = string> = { kind: T };

interface Shortcut {
  /** Accessible shortcut text. */
  aria?: string;
  keys: string;
}

interface Toolkit {
  Provider: (props: { locale?: string; children: unknown }) => unknown;
}

interface Bag {
  state: { paused: boolean };
}

/** A result whose type parameter shares a name with the `Handle` type its looked-up member uses. */
export interface EngineResult<Handle = number> {
  input: Engine['input'];
  count: Handle;
}

/** @displayType {S}['state'] */
export type StateOf<S extends { state: unknown }> = S extends { state: infer State } ? State : never;

/** Collect entries into one list. */
export function useEntries<T extends string = string>(..._entries: (Entry<T> | undefined)[]): Entry<T>[] {
  return [];
}

/** Classify a value. */
export function useKindOf<S>(_value: S): (S extends string ? 'text' : 'other') | undefined {
  return undefined;
}

/** Return an identity function. */
export function useIdentity(): <T>(value: T) => T {
  return (value) => value;
}

/** Step a value. */
export function useStep(step = 5): number {
  return step;
}

/** Read shortcut details. */
export function useShortcut(): Shortcut {
  return { keys: '' };
}

/** Read state through a hook literal. */
export function useBagHooks(): { read: () => StateOf<Bag> } {
  return { read: () => ({ paused: false }) };
}

function createToolkit(): Toolkit {
  return { Provider: () => null };
}

const defaultToolkit = createToolkit();

/**
 * Mounts the default toolkit.
 *
 * @public
 */
export const ToolkitProvider = defaultToolkit.Provider;

/** Read the engine input. */
export function useEngineInput<Handle = number>(): EngineResult<Handle> {
  return { input: { current: '' }, count: 0 as Handle };
}
