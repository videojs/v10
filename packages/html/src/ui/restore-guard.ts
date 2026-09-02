/**
 * Suppresses change notifications while an element replays state it already holds into a recreated imperative API.
 *
 * Popup and dialog APIs are created per DOM connection and report every open through `onOpenChange`, including the open
 * that restores a still-open element after it moves in the DOM. Elements check {@linkcode active} inside that callback
 * and wrap the replay in {@linkcode run} so restoring emits no duplicate `open-change` event.
 */
export class RestoreGuard {
  #active = false;

  /** True while {@linkcode run} is replaying state. */
  get active(): boolean {
    return this.#active;
  }

  /** Run `restore` with change notifications suppressed. */
  run(restore: () => void): void {
    this.#active = true;

    try {
      restore();
    } finally {
      this.#active = false;
    }
  }
}
