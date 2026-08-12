/**
 * The `<video>` binding a background video actually uses: somewhere to keep the
 * attached element, and the four properties whose values it fixes.
 *
 * `HTMLVideoElementHost` would do this too, along with the rest of the WHATWG
 * surface — `currentTime`, `play()`, picture-in-picture, fullscreen, event
 * forwarding, media-component registration. None of it is reachable here. The
 * engine drives playback, the element exposes `src` and nothing else, and the
 * background player's store subscribes to no features at all, so every one of
 * those members is weight a consumer downloads to never call. Measured, the full
 * host is 1,644 B gzipped against this one's 234 B, and swapping it takes ~1.2 KB
 * off each of the three published entries.
 *
 * ⚠️ The tradeoff is that this is no longer a `Media` structurally, so the layers
 * above cast to reach it, and **a store feature added to `backgroundFeatures`
 * would read properties that aren't here** — silently, as `undefined`. That is
 * the point at which this should become a composition over the shared host
 * rather than a replacement for it.
 */
export class BackgroundVideoHost {
  #target: HTMLVideoElement | null = null;

  attach(target: HTMLVideoElement): void {
    if (!target || this.#target === target) return;
    this.#target = target;
  }

  detach(): void {
    this.#target = null;
  }

  // Read back off the element rather than stored, so they describe what is
  // playing instead of what was asked for — see the adapter's note on why the
  // Media declares none of these itself.
  get loop(): boolean {
    return this.#target?.loop ?? false;
  }

  set loop(value: boolean) {
    if (this.#target) this.#target.loop = value;
  }

  get muted(): boolean {
    return this.#target?.muted ?? false;
  }

  set muted(value: boolean) {
    if (this.#target) this.#target.muted = value;
  }

  get autoplay(): boolean {
    return this.#target?.autoplay ?? false;
  }

  set autoplay(value: boolean) {
    if (this.#target) this.#target.autoplay = value;
  }

  get preload(): HTMLVideoElement['preload'] {
    return this.#target?.preload ?? 'metadata';
  }

  set preload(value: HTMLVideoElement['preload']) {
    if (this.#target) this.#target.preload = value;
  }
}
