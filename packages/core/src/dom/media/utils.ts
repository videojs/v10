import { isFunction } from '@videojs/utils/predicate';
import type {
  Component,
  ComponentConstructor,
  Components,
  HTMLMediaElementHost,
  HTMLMediaTargetLike as TargetLike,
} from './media-host';

type Host<T extends TargetLike = any> = HTMLMediaElementHost<T, any>;

const registry = new WeakMap<Host, Components>();

export function getComponents(host: Host) {
  let map = registry.get(host);
  if (!map) registry.set(host, (map = new Map() as Components));
  return map;
}

export function addComponent<T extends Component>(host: Host, component: T) {
  const components = getComponents(host);
  // Get the component's constructor to use as the key for the component in the registry.
  const ctor = component.constructor as ComponentConstructor<T>;
  components.set(ctor, component);

  // Expose a live binding on `host.config`: reads return the component, writes assign onto it.
  const { configKey } = ctor;
  if (configKey) {
    // Adopt config set before the component was registered.
    const initial = host.config[configKey];
    Object.defineProperty(host.config, configKey, {
      enumerable: true,
      configurable: true,
      get: () => component,
      set: (value) => Object.assign(component, value),
    });

    if (initial) Object.assign(component, initial);
  }

  component.setMedia?.(host);

  // @ts-expect-error `target` is protected, but these helpers are the host's own machinery.
  if (host.target) component.attach?.(host.target);

  return () => {
    if (components.get(ctor) === component) {
      components.delete(ctor);

      if (configKey) delete host.config[configKey];
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

type AnyFn = (...args: any[]) => any;

/** Invoke a media method on its owner, preserving the owner as `this`. Returns `undefined` when no owner exposes it. */
export function callProp<K extends keyof TargetLike>(
  host: Host,
  prop: K,
  ...args: Parameters<Extract<TargetLike[K], AnyFn>>
): ReturnType<Extract<TargetLike[K], AnyFn>> | undefined {
  const own = getOwner(host, prop);
  const fn = own?.[prop];
  return isFunction(fn) ? fn.apply(own, args) : undefined;
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
