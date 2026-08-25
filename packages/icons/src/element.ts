export type IconMap = Readonly<Record<string, string>>;
export type IconLoader = () => IconMap | Promise<IconMap>;

const HTMLElementBase = globalThis.HTMLElement ?? class {};

/** Renders registered SVG icon families in the light DOM. */
export class MediaIconElement extends HTMLElementBase {
  static #families = new Map<string, Map<string, string>>();
  static #loaders = new Map<string, IconLoader>();
  static #loading = new Map<string, Promise<void>>();
  static #instances = new Set<MediaIconElement>();

  static register(family: string, icons: IconMap): void {
    const familyIcons = MediaIconElement.#families.get(family) ?? new Map<string, string>();

    for (const [name, svg] of Object.entries(icons)) familyIcons.set(name, svg);

    MediaIconElement.#families.set(family, familyIcons);

    for (const icon of MediaIconElement.#instances) {
      if (icon.#family === family) icon.#render();
    }
  }

  static registerLoader(family: string, load: IconLoader): void {
    MediaIconElement.#loaders.set(family, load);

    for (const icon of MediaIconElement.#instances) {
      if (icon.#family === family) icon.#render();
    }
  }

  static load(family: string): Promise<void> {
    if (MediaIconElement.#families.has(family)) return Promise.resolve();

    const pending = MediaIconElement.#loading.get(family);
    if (pending) return pending;

    const loader = MediaIconElement.#loaders.get(family);
    if (!loader) return Promise.resolve();

    const loading = Promise.resolve()
      .then(loader)
      .then((icons) => MediaIconElement.register(family, icons))
      .finally(() => MediaIconElement.#loading.delete(family));

    MediaIconElement.#loading.set(family, loading);
    return loading;
  }

  static get observedAttributes(): string[] {
    return ['name', 'family'];
  }

  connectedCallback(): void {
    MediaIconElement.#instances.add(this);
    this.#render();
  }

  disconnectedCallback(): void {
    MediaIconElement.#instances.delete(this);
  }

  attributeChangedCallback(): void {
    this.#render();
  }

  get #family(): string {
    return this.getAttribute('family') || 'default';
  }

  #render(): void {
    if (!this.isConnected) return;

    const name = this.getAttribute('name');
    const family = this.#family;
    const familyIcons = MediaIconElement.#families.get(family);
    const svg = name ? familyIcons?.get(name) : undefined;

    if (svg !== undefined) {
      if (this.innerHTML !== svg) this.innerHTML = svg;

      return;
    }

    this.replaceChildren();

    if (familyIcons || !name || !MediaIconElement.#loaders.has(family)) return;

    void MediaIconElement.load(family).then(
      () => {
        if (this.isConnected && this.getAttribute('name') === name && this.#family === family) this.#render();
      },
      () => {}
    );
  }
}
