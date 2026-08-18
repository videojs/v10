import type {
  HTMLMediaElementHost,
  MediaComponent,
  MediaComponentConstructor,
  MediaComponents,
  HTMLMediaTargetLike as TargetLike,
} from '../media-host';

export type MediaHost<T extends TargetLike = any> = HTMLMediaElementHost<T, any>;

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

export function getMediaProp<T extends TargetLike, K extends keyof T>(host: MediaHost<T>, prop: K): T[K] | undefined {
  return getMediaOwner(host, prop)?.[prop];
}

export function setMediaProp<T extends TargetLike, K extends keyof T>(host: MediaHost<T>, prop: K, value: T[K]): void {
  const own = getMediaOwner(host, prop);
  if (own) (own as Record<K, T[K]>)[prop] = value;
}

/** Find the object that owns a media property: the first component `override` exposing it, otherwise the attached target. */
export function getMediaOwner<T extends TargetLike>(host: MediaHost<T>, prop: keyof T): Partial<T> | null {
  for (const component of getMediaComponents(host).values()) {
    const override = component.targetOverride as Partial<T> | null | undefined;
    if (override?.[prop] !== undefined) return override;
  }
  // @ts-expect-error `target` is protected, but these helpers are the host's own machinery.
  return host.target;
}
