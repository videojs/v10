export function useSyncProps<Props extends object, Rest extends Record<string, unknown>>(
  target: Props,
  props: Partial<Props> & Rest,
  defaults: Props
): Omit<Rest, keyof Props> {
  const rest: Record<string, unknown> = {};

  for (const key in props) {
    if (key in defaults) {
      const value = props[key] ?? (defaults as Record<string, unknown>)[key];
      if (target[key as keyof typeof target] !== value) target[key as keyof typeof target] = value as any;
    } else {
      rest[key] = props[key];
    }
  }

  return rest as Omit<Rest, keyof Props>;
}
