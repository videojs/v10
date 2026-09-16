import type {
  AnyHTMLMediaAdapter,
  MediaExtension,
  MediaExtensionConstructor,
  MediaExtensions,
  HTMLMediaTargetLike as TargetLike,
} from '../html-media-adapter';

const componentRegistry = new WeakMap<AnyHTMLMediaAdapter, MediaExtensions>();

export function getMediaExtensions(adapter: AnyHTMLMediaAdapter) {
  let map = componentRegistry.get(adapter);

  if (!map) componentRegistry.set(adapter, (map = new Map() as MediaExtensions));

  return map;
}

export function addMediaExtension<T extends MediaExtension>(adapter: AnyHTMLMediaAdapter, component: T) {
  const components = getMediaExtensions(adapter);
  // Get the component's constructor to use as the key for the component in the registry.
  const ctor = component.constructor as MediaExtensionConstructor<T>;

  const previous = components.get(ctor);

  if (previous && previous !== component) previous.detach?.();

  components.set(ctor, component);

  component.setAdapter?.(adapter);

  // @ts-expect-error `target` is protected, but these helpers are the adapter's own machinery.
  if (adapter.target) component.attach?.(adapter.target);

  return () => {
    if (components.get(ctor) === component) {
      component.detach?.();
      components.delete(ctor);
    }
  };
}

export function getMediaProp<T extends TargetLike, K extends keyof T>(
  adapter: AnyHTMLMediaAdapter<T>,
  prop: K
): T[K] | undefined {
  return getMediaOwner(adapter, prop)?.[prop];
}

export function setMediaProp<T extends TargetLike, K extends keyof T>(
  adapter: AnyHTMLMediaAdapter<T>,
  prop: K,
  value: T[K]
): void {
  const own = getMediaOwner(adapter, prop);

  if (own) (own as Record<K, T[K]>)[prop] = value;
}

/**
 * Find the object that owns a media property: the first component `override` exposing it, otherwise the attached
 * target.
 */
export function getMediaOwner<T extends TargetLike>(adapter: AnyHTMLMediaAdapter<T>, prop: keyof T): Partial<T> | null {
  for (const component of getMediaExtensions(adapter).values()) {
    const override = component.targetOverride as Partial<T> | null | undefined;
    if (override?.[prop] !== undefined) return override;
  }

  // @ts-expect-error `target` is protected, but these helpers are the adapter's own machinery.
  return adapter.target;
}
