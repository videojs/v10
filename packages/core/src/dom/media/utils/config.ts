import type { Component, ComponentConstructor, MediaConfig } from '../media-host';
import { getComponents, type Host } from './components';

const configRegistry = new WeakMap<Host, MediaConfig>();

/** Free-form config bag: host/engine keys not owned by a `configKey` component. */
export function getConfigBag(host: Host): MediaConfig {
  let bag = configRegistry.get(host);
  if (!bag) configRegistry.set(host, (bag = {}));
  return bag;
}

function getComponentForConfigKey(host: Host, configKey: string): Component | undefined {
  for (const [ctor, component] of getComponents(host)) {
    if ((ctor as ComponentConstructor).configKey === configKey) return component;
  }
  return undefined;
}

/**
 * Read host config: the free-form bag plus each registered component reflected
 * live under its `configKey`. Returns a fresh object each call, so mutating the
 * result does not write through to components — use {@link writeConfig} for that.
 */
export function readConfig(host: Host): MediaConfig {
  const config: MediaConfig = { ...getConfigBag(host) };
  for (const [ctor, component] of getComponents(host)) {
    const { configKey } = ctor as ComponentConstructor;
    if (configKey) config[configKey] = component;
  }
  return config;
}

/**
 * Write host config. Assigning a new config object signals intent to start from
 * a clean slate: the free-form bag is reset, so prior host/engine keys not
 * present in `value` are dropped. Component config is preserved — each component
 * keeps its state, and only keys present in `value` overwrite it (per-key, via
 * `Object.assign`).
 */
export function writeConfig(host: Host, value: MediaConfig): void {
  const bag = getConfigBag(host);
  for (const key of Object.keys(bag)) delete bag[key];
  for (const key of Object.keys(value)) {
    const component = getComponentForConfigKey(host, key);
    if (component) Object.assign(component, value[key]);
    else bag[key] = value[key];
  }
}
