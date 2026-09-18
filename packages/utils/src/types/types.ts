export type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

/** Matches strings that include the literal substring `Needle` (for example a `{param}` token). */
export type Contains<Needle extends string> = `${string}${Needle}${string}`;

/** The type-level counterpart of `camelCase`, for kebab-case input. */
export type CamelCase<Value extends string> = Value extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : Value;

export type EnsureRecord<Keys extends PropertyKey, Value, Target extends Record<Keys, Value>> = Target;

export type Constructor<T, Arguments extends unknown[] = any[]> = new (...args: Arguments) => T;

export type AbstractConstructor<T, Arguments extends unknown[] = any[]> = abstract new (...args: Arguments) => T;

export type AnyConstructor<T, Arguments extends unknown[] = any[]> =
  | Constructor<T, Arguments>
  | AbstractConstructor<T, Arguments>;

export type Mixin<Base, Result> = <T extends Constructor<Base>>(Base: T) => T & Constructor<Result>;

/**
 * The constructor type a class mixin returns: the base's instance type plus `Props`, with the base's statics.
 *
 * `Arguments` names the constructor's parameters. A mixin class itself must declare `constructor(...args: any[])`, so
 * this is the one place the options it reads off `args[0]` can be typed for callers. It defaults to the base's own
 * parameters: a mixin that adds nothing at construction forwards what its base accepts, so a typed constructor deeper
 * in the chain stays typed rather than widening back to `any[]` at every layer above it.
 */
export type MixinReturn<
  Base extends AnyConstructor<any>,
  Props,
  Arguments extends unknown[] = ConstructorParameters<Base>,
> = Constructor<InstanceType<Base> & Props, Arguments> & Omit<Base, 'prototype'>;

export type Falsy<T> = T | false | null | undefined;

export type EnsureFunction<T> = T extends (...args: any[]) => any ? T : never;

export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

export type NonNullableObject<T extends object> = {
  [P in keyof T]-?: Exclude<T[P], null | undefined>;
};
