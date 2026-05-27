import type { MediaLayer } from './media-layer';

/**
 * Contract for an installable media extension. Implementations attach behavior
 * to a host (typically by pushing a {@link MediaLayer} via `addLayer`, wiring
 * listeners, or fetching resources) and clean up via the abort signal and/or
 * a returned teardown. Use {@link defineExtension} to brand the factory so
 * installs dedup per-host and the instance can be looked up later.
 *
 * @public
 */
export interface MediaExtension<Host extends MediaLayer = MediaLayer> {
  /** Human-readable identifier used in dev-only warnings and debugging. */
  readonly name?: string;
  /**
   * Install on `media`. `signal` aborts on destroy — pass it to
   * `addEventListener` / `fetch` for automatic cleanup. Optionally return
   * a teardown for non-signal cleanup.
   */
  install(media: Host, options: { signal: AbortSignal }): (() => void) | void;
}

/** Configuration surface of a {@link MediaExtension} — every property except `install`. */
export type ExtensionConfig<Ext extends MediaExtension> = Omit<Ext, 'install'>;

/** Public-facing install signature after {@link defineExtension} patches the instance. */
export interface InstalledExtension<Host extends MediaLayer = MediaLayer> {
  install(media: Host): () => void;
}

// Stamped onto each extension instance by `defineExtension`. `id` identifies
// the *factory* — every instance the factory produces shares it, which is
// what lets `install` dedup. `install` preserves the user-defined method so
// the registry can still invoke it after the public `install` has been
// swapped for the registry shortcut.
type Brand<Host extends MediaLayer> = { id: symbol; install: MediaExtension<Host>['install'] };

/** Tuple type for the factory's parameter: required when props have a required field, optional when all-optional, none for `void`. */
// biome-ignore lint/complexity/noBannedTypes: `{}` is the sentinel that detects "all properties optional".
type ResolveParams<Props> = [Props] extends [void] ? [] : {} extends Props ? [props?: Props] : [props: Props];

// Cross-realm key for the brand — `Symbol.for` keeps identity stable across
// module boundaries so an extension defined in one bundle is still recognized
// when installed on a host loaded from another.
const EXTENSION_SYMBOL = Symbol.for('@videojs/media-extension');

// One list per host — keys held weakly so the registry tears itself down
// when the host is collected.
const extensionLists = new WeakMap<MediaLayer, MediaExtensionList>();

// Reverse lookup for `MediaExtensionList.get(factory)`: the factory function
// itself → the brand id it stamps. Weak so factories can be GC'd.
const extensionFactoryIds = new WeakMap<object, symbol>();

const brandOf = <Host extends MediaLayer>(ext: MediaExtension<Host>) =>
  (ext as { [EXTENSION_SYMBOL]?: Brand<Host> })[EXTENSION_SYMBOL];

/**
 * Define a media extension factory.
 *
 * The returned instance's `install(media)` method is patched to delegate to
 * {@link getExtensions} on that host, so `ext.install(media)` and
 * `getExtensions(media).install(ext)` share the same dedup path. The framework
 * creates an `AbortController` per install and passes its signal to the
 * user-defined `install(media, { signal })`; the returned destroy aborts that
 * signal and then runs any teardown the extension returned.
 *
 * @example
 * const googleCast = defineExtension((props: GoogleCastProps) => ({
 *   ...props,
 *   install(media, { signal }) {
 *     return addLayer(media, new GoogleCastLayer(props));
 *   },
 * }));
 * googleCast({ receiverApplicationId: '…' }).install(media);
 *
 * @public
 */
export function defineExtension<
  Props = void,
  Host extends MediaLayer = MediaLayer,
  Ext extends MediaExtension<Host> = MediaExtension<Host>,
>(factory: (props: Props) => Ext): (...args: ResolveParams<Props>) => Omit<Ext, 'install'> & InstalledExtension<Host> {
  // Instance-unique — every instance the factory produces shares this id, so
  // two `googleCast()` calls dedup against each other on the same host.
  const id = Symbol('@videojs/media-extension');

  const createExtension = (...args: ResolveParams<Props>) => {
    const ext = factory(args[0] as Props);

    // Skip if already branded — handles the singleton case where the factory
    // returns the same instance on repeat calls.
    if (!brandOf(ext)) {
      // Capture the user-defined install before we swap the instance method.
      // Bound to `ext` so `this`-using extensions still work when the
      // registry calls it back via `brand.install`.
      const brand: Brand<Host> = { id, install: ext.install.bind(ext) };

      // Non-enumerable so the brand doesn't leak into spreads, `Object.keys`,
      // or JSON serialization of extension config.
      Object.defineProperty(ext, EXTENSION_SYMBOL, { value: brand, enumerable: false });

      // Replace the user-defined install with the registry shortcut so
      // `ext.install(media)` and `getExtensions(media).install(ext)` go
      // through the same dedup path.
      (ext as unknown as InstalledExtension<Host>).install = (media) => getExtensions(media).install(ext);
    }

    return ext as unknown as Omit<Ext, 'install'> & InstalledExtension<Host>;
  };

  // Register so `MediaExtensionList.get(factory)` can resolve back to the id.
  extensionFactoryIds.set(createExtension, id);

  return createExtension;
}

/**
 * Access the extension list for a media host. Created lazily on first access;
 * the single entry point for installing, looking up, and iterating extensions.
 *
 * @example
 * getExtensions(media).install(googleCast({ receiverApplicationId: '…' }));
 *
 * @public
 */
export function getExtensions<Host extends MediaLayer>(media: Host): MediaExtensionList<Host> {
  let list = extensionLists.get(media);
  if (!list) extensionLists.set(media, (list = new MediaExtensionList(media)));
  return list as MediaExtensionList<Host>;
}

/**
 * Per-media bookkeeping for installed extensions. Returned by
 * {@link getExtensions}. Iterating yields the live instances in install order.
 *
 * @example
 * getExtensions(media).install(googleCast({ receiverApplicationId: '…' }));
 * const cast = getExtensions(media).get(googleCast);
 * for (const ext of getExtensions(media)) console.log(ext);
 *
 * @public
 */
export class MediaExtensionList<Host extends MediaLayer = MediaLayer> {
  readonly #media: Host;
  #entries = new Map<symbol, { instance: MediaExtension<Host>; destroy: () => void }>();

  constructor(media: Host) {
    this.#media = media;
  }

  /** Yields installed extension instances in install order. */
  *[Symbol.iterator]() {
    for (const entry of this.#entries.values()) yield entry.instance;
  }

  /** Number of currently-installed extensions. */
  get length() {
    return this.#entries.size;
  }

  /**
   * Install `extension` on the host. Branded extensions (created via
   * {@link defineExtension}) dedup per host — a second install for the same
   * factory returns the existing destroy and warns in dev. Un-branded
   * extensions skip dedup and bookkeeping. Returns an idempotent destroy that
   * aborts the install signal and runs any teardown the extension returned.
   */
  install(extension: MediaExtension<Host> | InstalledExtension<Host>) {
    const ext = extension as MediaExtension<Host>;
    const brand = brandOf(ext);

    // Per-install controller — each install owns its own signal so destroy
    // aborts only this install, not other extensions on the host.
    const controller = new AbortController();
    const options = { signal: controller.signal };

    // Un-branded escape hatch: extension not wrapped by `defineExtension`.
    // Skip dedup and bookkeeping — there's no factory id to key off.
    if (!brand) {
      const teardown = ext.install(this.#media, options);

      return () => {
        if (controller.signal.aborted) return;
        controller.abort();
        teardown?.();
      };
    }

    // Dedup: the same factory installed twice on the same host returns the
    // existing destroy. Warn in dev to surface accidental double installs.
    const existing = this.#entries.get(brand.id);
    if (existing) {
      if (__DEV__) console.warn('[vjs-media-extension] Extension already installed on this media.');
      return existing.destroy;
    }

    // Use `brand.install`, not `ext.install` — the latter has been swapped
    // for the registry shortcut and would recurse back into this method.
    const teardown = brand.install(this.#media, options);

    const destroy = () => {
      if (controller.signal.aborted) return;

      // Order matters:
      //   1. abort — so signal-based cleanups in `install` run first.
      //   2. delete — so a teardown that calls `getExtensions(media).get(...)`
      //      observes the extension as already gone.
      //   3. teardown — explicit cleanup runs last.
      controller.abort();
      this.#entries.delete(brand.id);
      teardown?.();
    };

    this.#entries.set(brand.id, { instance: ext, destroy });

    return destroy;
  }

  /**
   * Look up the live extension instance installed from `factory`, or
   * `undefined` if none is installed (or `factory` wasn't created by
   * {@link defineExtension}). Mutating the returned instance mutates the
   * registered entry — useful for live config updates.
   */
  get<Ext extends MediaExtension<Host> | InstalledExtension<Host>>(factory: (...args: any[]) => Ext) {
    const id = extensionFactoryIds.get(factory);
    return id ? (this.#entries.get(id)?.instance as Ext | undefined) : undefined;
  }

  /** Tear down every installed extension in install order. */
  destroy() {
    // Snapshot — each destroy mutates `#entries`.
    const destroys = [...this.#entries.values()].map((e) => e.destroy);
    for (const destroy of destroys) destroy();
  }
}
