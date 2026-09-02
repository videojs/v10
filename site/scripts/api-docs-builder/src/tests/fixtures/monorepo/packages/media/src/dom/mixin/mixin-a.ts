/**
 * Mock mixin (Shape A — function declaration).
 *
 * Exercises:
 *   - Function-declaration mixin walking
 *   - Property addition with JSDoc
 *   - A dispatched-but-untagged event (foochange) is NOT documented — only
 *     `@fires`-tagged events surface in the element-specific list.
 *   - A `@fires` event that is ALSO part of the native contract (streamtypechange,
 *     in VideoEvents via MediaStreamTypeEvents) — mirrors HlsMedia. It must surface
 *     in the described element-specific list even though it is a native event.
 *   - Defaults declared as `static defaultProps` on the mixin's inner class (mirrors MuxMixin)
 */
type Constructor<T = object> = new (...args: any[]) => T;

/**
 * @fires streamtypechange - Fired when the detected stream type changes.
 */
export function MixinAFooMixin<Base extends Constructor>(BaseClass: Base) {
  class MixinAFoo extends BaseClass {
    static readonly defaultProps = {
      foo: '',
    };

    #foo: string = MixinAFoo.defaultProps.foo;

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
