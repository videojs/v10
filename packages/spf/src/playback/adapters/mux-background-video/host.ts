/**
 * The `<video>` binding a background video uses: somewhere to keep the attached
 * element, and the four properties the Media fixes on it.
 *
 * That is the whole surface anything here reaches. The engine drives playback,
 * the element exposes `src` and nothing else, and the background player
 * subscribes to no store features, so nothing asks a background video for
 * `currentTime`, `play()`, picture-in-picture, fullscreen, forwarded events, or
 * media components. Holding the host to what is reachable is what keeps this
 * entry free of `@videojs/media`, and small enough to suit a component whose
 * whole pitch is its size.
 *
 * ⚠️ It implements too little to be a `Media` structurally, which bounds what may
 * consume it: a store feature reading any property outside this set gets
 * `undefined` rather than an error. A Media needing more of the media surface
 * belongs on a host that provides it.
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
