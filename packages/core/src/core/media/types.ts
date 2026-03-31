// Detects readonly vs writable properties via conditional type identity check.
type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

type WritableKeys<T> = {
  [K in keyof T]-?: IfEquals<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, K, never>;
}[keyof T];

type SettableKeys<T> = {
  [K in WritableKeys<T>]: T[K] extends (...args: any[]) => any ? never : K;
}[WritableKeys<T>];

type ExcludeInternal<K> = K extends `_${string}` ? never : K;

export type InferDelegateProps<D extends abstract new (...args: any[]) => any> = Partial<
  Pick<InstanceType<D>, ExcludeInternal<SettableKeys<InstanceType<D>>>>
>;
