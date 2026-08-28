import type {
  MediaComponent,
  MediaComponentConstructor,
  MediaComponents,
  MediaHostBase,
  HTMLMediaTargetLike as TargetLike,
} from '../media-host/base';

export type MediaHost = MediaHostBase;

const componentRegistry = new WeakMap<MediaHost, MediaComponents>();

export function getMediaComponents(host: MediaHost) {
  let map = componentRegistry.get(host);

  if (!map) componentRegistry.set(host, (map = new Map() as MediaComponents));

  return map;
}

export function addMediaComponent<T extends MediaComponent>(host: MediaHost, component: T) {
  const components = getMediaComponents(host);
  // Get the component's constructor to use as the key for the component in the registry.
  const ctor = component.constructor as MediaComponentConstructor<T>;

  const previous = components.get(ctor);

  if (previous && previous !== component) previous.detach?.();

  components.set(ctor, component);

  component.setMedia?.(host);

  // @ts-expect-error `target` is protected, but these helpers are the host's own machinery.
  if (host.target) component.attach?.(host.target);

  return () => {
    if (components.get(ctor) === component) {
      component.detach?.();
      components.delete(ctor);
    }
  };
}

/**
 * Read a forwarded media property.
 *
 * `Capability` names the contract the property belongs to. It defaults to the full target surface for hosts that
 * forward the whole `HTMLMediaElement` API; a capability mixin passes its own capability instead, so the call site
 * states exactly what it is forwarding.
 */
export function getMediaProp<Capability extends object = TargetLike, K extends keyof Capability = keyof Capability>(
  host: MediaHost,
  prop: K
): Capability[K] | undefined {
  return getMediaOwner<Capability>(host, prop)?.[prop];
}

export function setMediaProp<Capability extends object = TargetLike, K extends keyof Capability = keyof Capability>(
  host: MediaHost,
  prop: K,
  value: Capability[K]
): void {
  const own = getMediaOwner<Capability>(host, prop);

  if (own) (own as Record<K, Capability[K]>)[prop] = value;
}

/**
 * Find the object that owns a media property: the first component `override` exposing it, otherwise the attached
 * target.
 */
export function getMediaOwner<Capability extends object = TargetLike>(
  host: MediaHost,
  prop: keyof Capability
): Partial<Capability> | null {
  for (const component of getMediaComponents(host).values()) {
    const override = component.targetOverride as Partial<Capability> | null | undefined;
    if (override?.[prop] !== undefined) return override;
  }

  // @ts-expect-error `target` is protected, but these helpers are the host's own machinery.
  return host.target;
}
