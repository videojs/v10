type MediaChild = HTMLTrackElement | HTMLSourceElement;

/**
 * Mirrors an element's light-DOM `<track>` and `<source>` children into the media element it renders, so markup written
 * against the custom element reaches the native element that plays it.
 *
 * Each child is cloned once and its clone follows the original's attribute changes; a child that leaves the default
 * slot takes its clone with it. Default `chapters` and `metadata` tracks are enabled by hand, because browsers ignore
 * the `default` attribute on a track added from script.
 */
export class MediaChildren {
  #host: HTMLElement;
  #target: () => Element | null;
  #clones = new Map<MediaChild, MediaChild>();
  #observer = new MutationObserver((mutations) => this.#syncAttributes(mutations));

  /**
   * @param host - The custom element whose default slot holds the children.
   * @param target - Resolves the media element the clones are appended to.
   */
  constructor(host: HTMLElement, target: () => Element | null) {
    this.#host = host;
    this.#target = target;
  }

  /** Bring the clones in step with the default slot's assigned children. Call it after construction and on `slotchange`. */
  sync(): void {
    const slot = this.#host.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])');
    const children = new Set(slot?.assignedElements({ flatten: true }).filter(isMediaChild) ?? []);

    for (const [child, clone] of this.#clones) {
      if (children.has(child)) continue;

      clone.remove();
      this.#clones.delete(child);
    }

    const target = this.#target();

    for (const child of children) {
      let clone = this.#clones.get(child);

      if (!clone) {
        clone = child.cloneNode() as MediaChild;
        this.#clones.set(child, clone);
        this.#observer.observe(child, { attributes: true });
      }

      target?.append(clone);
      enableDefaultTrack(clone);
    }
  }

  /** Stop following the children. Call it when the host is done for good; the clones are left where they are. */
  disconnect(): void {
    this.#observer.disconnect();
    this.#clones.clear();
  }

  #syncAttributes(mutations: MutationRecord[]): void {
    for (const { type, target, attributeName } of mutations) {
      if (type !== 'attributes' || !attributeName) continue;

      const child = target as MediaChild;
      const clone = this.#clones.get(child);
      if (!clone) continue;

      const value = child.getAttribute(attributeName);

      if (value === null) clone.removeAttribute(attributeName);
      else clone.setAttribute(attributeName, value);

      enableDefaultTrack(clone);
    }
  }
}

function isMediaChild(element: Element): element is MediaChild {
  return element.localName === 'track' || element.localName === 'source';
}

function enableDefaultTrack(element: MediaChild): void {
  if (element.localName !== 'track') return;

  const track = element as HTMLTrackElement;

  if (track.default && (track.kind === 'chapters' || track.kind === 'metadata') && track.track?.mode === 'disabled') {
    track.track.mode = 'hidden';
  }
}
