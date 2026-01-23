export type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

export type Constructor<T, Arguments extends unknown[] = any[]> = new (...args: Arguments) => T;

export type AbstractConstructor<T, Arguments extends unknown[] = any[]> = abstract new (...args: Arguments) => T;

export type AnyConstructor<T, Arguments extends unknown[] = any[]> =
  | Constructor<T, Arguments>
  | AbstractConstructor<T, Arguments>;

export type Mixin<Base, Result> = <T extends Constructor<Base>>(Base: T) => T & Constructor<Result>;

export type Falsy<T> = T | false | null | undefined;

export type EnsureFunction<T> = T extends (...args: any[]) => any ? T : never;
