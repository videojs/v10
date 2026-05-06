/**
 * Mock mixin-chain leaf class — mirrors MuxVideoMedia / NativeHlsMedia.
 *
 * Exercises: a class extending MixinB(MixinA(BaseHost)) — a chain of two
 * mixins of different syntactic shapes. The builder must walk the
 * call-expression extends, follow each mixin to its source file, and
 * collect getters/setters from each mixin's inner class.
 */
import { MixinBaseHost } from './base-host';
import { MixinAFooMixin } from './mixin-a';
import { MixinBVolumeMixin } from './mixin-b';

export class MixinHost extends MixinBVolumeMixin(MixinAFooMixin(MixinBaseHost)) {
  #bar: number = 0;

  /** Leaf class own property. */
  get bar(): number {
    return this.#bar;
  }

  set bar(value: number) {
    this.#bar = value;
  }
}
