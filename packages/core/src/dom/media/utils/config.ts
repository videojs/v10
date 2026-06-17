import type { Component, ComponentConstructor, MediaConfig } from '../media-host';
import { getComponents, type Host } from './components';

const configRegistry = new WeakMap<Host, MediaConfig>();
const stagedRegistry = new WeakMap<Host, MediaConfig>();

/** Free-form config bag: host/engine keys not owned by a `configKey` component. */
function getConfigBag(host: Host): MediaConfig {
  let bag = configRegistry.get(host);
  if (!bag) configRegistry.set(host, (bag = {}));
  return bag;
}

/**
 * Last-written value for every host-level (non-component) key, retained across
 * free-form resets. We can't tell a free-form key from a not-yet-registered
 * component namespace at write time, so we keep all of them here; when a
 * component registers, it adopts its namespace from this store (see
 * {@link adoptStagedConfig}). Free-form keys that never match a component just
 * sit here harmlessly until the host is collected.
 */
function getStagedConfig(host: Host): MediaConfig {
  let staged = stagedRegistry.get(host);
  if (!staged) stagedRegistry.set(host, (staged = {}));
  return staged;
}

/**
 * Adopt config staged under `configKey` (written before the component
 * registered) onto a freshly-registered component, then drop it so the
 * component becomes the sole owner of that namespace.
 */
export function adoptStagedConfig(host: Host, configKey: string, component: object): void {
  const staged = getStagedConfig(host);
  if (configKey in staged) {
    Object.assign(component, staged[configKey]);
    delete staged[configKey];
  }
  delete getConfigBag(host)[configKey];
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
  const staged = getStagedConfig(host);
  for (const key of Object.keys(bag)) delete bag[key];
  for (const key of Object.keys(value)) {
    const component = getComponentForConfigKey(host, key);
    if (component) {
      Object.assign(component, value[key]);
    } else {
      bag[key] = value[key];
      // Retain the value so a component registering for this namespace later
      // still adopts it, even if a subsequent reset omits the key.
      staged[key] = value[key];
    }
  }
}
