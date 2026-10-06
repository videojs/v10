/**
 * Multi-part component fixture (core).
 *
 * Exercises: multi-part Props/State extraction, defaultProps merging,
 * non-boolean data-attr type inference (string union, number).
 */

export type FillLevel = 'empty' | 'partial' | 'full';

export type GesturePointer = 'mouse' | 'touch';

export interface GestureProps {
  pointer?: GesturePointer | undefined;
  disabled?: boolean | undefined;
  ignored: string;
}

export interface TapGestureOptions extends Pick<GestureProps, 'pointer' | 'disabled'> {
  target?: HTMLElement | null;
}

export interface BaseOverrideOptions {
  inherited: boolean;
  value?: string | null;
}

export interface OverrideOptions extends BaseOverrideOptions {
  value?: string;
  addListener(type: 'ready', listener: () => void): void;
  addListener(type: 'change', listener: (value: string) => void): void;
}

export interface FixtureStore {
  readonly state: { ready: boolean };
}

/** @displayType {Store}['state'] */
export type InferFixtureState<Store extends FixtureStore> = Store extends {
  readonly state: infer State;
}
  ? State
  : never;

export interface GaugeProps {
  /** Minimum value. */
  min: number;
  /** Maximum value. */
  max: number;
  /** Custom label for accessibility. */
  label: string | ((state: GaugeState) => string);
}

export interface GaugeState {
  /** Current value as a percentage (0–1). */
  percentage: number;
  /** The fill level. */
  fillLevel: FillLevel;
}

export class GaugeCore {
  static readonly defaultProps = {
    min: 0,
    max: 100,
    label: '',
  };
}
