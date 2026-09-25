type ClassPrimitive = string | Record<string, unknown> | false | null | undefined;
export type ClassValue = ClassPrimitive | readonly string[] | readonly ClassPrimitive[];

export type ClassName<State> = ClassValue | ((state: State) => ClassValue);

export function resolveClassName<State>(className: ClassName<State>, state: State): ClassValue {
  return typeof className === 'function' ? className(state) : className;
}

/** Merge the static and conditional classes used by copied skin source without depending on an app-owned utility. */
export function cn(...classes: ClassValue[]): string {
  const result: string[] = [];

  for (const value of classes.flat()) {
    if (typeof value === 'string' && value) {
      result.push(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const key in value) {
        if (value[key]) result.push(key);
      }
    }
  }

  // Shadcn trims every string literal it copies when `tailwind.cssVariables` is false, which would turn a `' '`
  // separator into `''`. Template literals pass through untouched.
  return result.reduce((classNames, className) => (classNames ? `${classNames} ${className}` : className), '');
}
