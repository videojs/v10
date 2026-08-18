/**
 * Mock mixin (Shape B — const arrow function).
 *
 * Exercises:
 *   - Arrow-function mixin walking
 *   - Override of a native HTMLMediaElement member (volume) without JSDoc → overridesNative
 *   - Override of a parent property (src) without JSDoc → description fallback
 */
type Constructor<T = object> = new (...args: any[]) => T;

export const MixinBVolumeMixin = <Base extends Constructor>(superclass: Base) => {
  class MixinBVolume extends superclass {
    #volume: number = 1;
    #src: string = '';

    // Overrides HTMLMediaElement.volume without JSDoc — exercises overridesNative.
    get volume(): number {
      return this.#volume;
    }

    set volume(value: number) {
      this.#volume = value;
    }

    // Overrides parent.src without JSDoc — exercises description fallback.
    get src(): string {
      return this.#src;
    }

    set src(value: string) {
      this.#src = value;
    }
  }

  return MixinBVolume as unknown as Base & Constructor<{ volume: number; src: string }>;
};
