import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type ClassName<State> = string | ((state: State) => string | undefined) | undefined;

export function resolveClassName<State>(className: ClassName<State>, state: State): string | undefined {
  return typeof className === 'function' ? className(state) : className;
}
