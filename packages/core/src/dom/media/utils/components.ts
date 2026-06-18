import type {
  Component,
  ComponentConstructor,
  Components,
  HTMLMediaElementHost,
  HTMLMediaTargetLike as TargetLike,
} from '../media-host';

export type Host<T extends TargetLike = any> = HTMLMediaElementHost<T, any>;

const componentRegistry = new WeakMap<Host, Components>();

export function getComponents(host: Host) {
  let map = componentRegistry.get(host);
  if (!map) componentRegistry.set(host, (map = new Map() as Components));
  return map;
}

export function addComponent<T extends Component>(host: Host, component: T) {
  const components = getComponents(host);
  // Get the component's constructor to use as the key for the component in the registry.
  const ctor = component.constructor as ComponentConstructor<T>;

  // Adopt any config set under this namespace before the component registered.
  const { configKey } = ctor;
  const staged = configKey ? host.config[configKey] : undefined;

  components.set(ctor, component);

  if (staged !== undefined) Object.assign(component, staged);

  component.setMedia?.(host);

  // @ts-expect-error `target` is protected, but these helpers are the host's own machinery.
  if (host.target) component.attach?.(host.target);

  return () => {
    if (components.get(ctor) === component) {
      components.delete(ctor);
    }
  };
}

export function getProp<T extends TargetLike, K extends keyof T>(host: Host<T>, prop: K): T[K] | undefined {
  return getOwner(host, prop)?.[prop];
}

export function setProp<T extends TargetLike, K extends keyof T>(host: Host<T>, prop: K, value: T[K]): void {
  const own = getOwner(host, prop);
  if (own) (own as Record<K, T[K]>)[prop] = value;
}

/** Find the object that owns a media property: the first component `override` exposing it, otherwise the attached target. */
export function getOwner<T extends TargetLike>(host: Host<T>, prop: keyof T): Partial<T> | null {
  for (const component of getComponents(host).values()) {
    const override = component.targetOverride as Partial<T> | null | undefined;
    if (override?.[prop] !== undefined) return override;
  }
  // @ts-expect-error `target` is protected, but these helpers are the host's own machinery.
  return host.target;
}
