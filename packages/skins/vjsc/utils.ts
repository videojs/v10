export { cn } from '@videojs/utils/style';

export type ClassName<State> = string | ((state: State) => string | undefined) | undefined;

export function resolveClassName<State>(className: ClassName<State>, state: State): string | undefined {
  return typeof className === 'function' ? className(state) : className;
}
