export type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

export type Constructor<T, Arguments extends unknown[] = any[]> = new (...args: Arguments) => T;

export type AbstractConstructor<T, Arguments extends unknown[] = any[]> = abstract new (...args: Arguments) => T;

export type AnyConstructor<T, Arguments extends unknown[] = any[]> =
  | Constructor<T, Arguments>
  | AbstractConstructor<T, Arguments>;

export type Mixin<Base, Result> = <T extends Constructor<Base>>(Base: T) => T & Constructor<Result>;

export type MixinReturn<Base extends AnyConstructor<any>, Props> = Constructor<InstanceType<Base> & Props> &
  Omit<Base, 'prototype'>;

export type Falsy<T> = T | false | null | undefined;

export type EnsureFunction<T> = T extends (...args: any[]) => any ? T : never;

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

export type NonNullableObject<T extends object> = {
  [P in keyof T]-?: Exclude<T[P], null | undefined>;
};

// Detects readonly vs writable properties via conditional type identity check.
type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

type WritableKeys<T> = {
  [K in keyof T]-?: IfEquals<{ [Q in K]: T[K] }, { -readonly [Q in K]: T[K] }, K, never>;
}[keyof T];

type SettableKeys<T> = {
  [K in WritableKeys<T>]: T[K] extends (...args: any[]) => any ? never : K;
}[WritableKeys<T>];

type ExcludeInternal<K> = K extends `_${string}` ? never : K;

export type InferClassProps<D extends abstract new (...args: any[]) => any> = Partial<
  Pick<InstanceType<D>, ExcludeInternal<SettableKeys<InstanceType<D>>>>
>;
