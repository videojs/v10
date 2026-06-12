/**
 * Mock mixin (Shape A — function declaration).
 *
 * Exercises:
 *   - Function-declaration mixin walking
 *   - Property addition with JSDoc
 *   - Element-specific event extraction via this.dispatchEvent(new Event('foochange'))
 *   - Defaults declared in the mixin's own file (mirrors muxDataMediaDefaultProps)
 */
type Constructor<T = object> = new (...args: any[]) => T;

export const mixinAFooDefaultProps = {
  foo: '',
};

export function MixinAFooMixin<Base extends Constructor>(BaseClass: Base) {
  class MixinAFoo extends BaseClass {
    #foo: string = '';

    /** Mixin A documentation. */
    get foo(): string {
      return this.#foo;
    }

    set foo(value: string) {
      this.#foo = value;
      (this as unknown as EventTarget).dispatchEvent(new Event('foochange'));
    }
  }

  return MixinAFoo as unknown as Base & Constructor<{ foo: string }>;
}
