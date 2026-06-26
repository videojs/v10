import { listen } from '@videojs/utils/dom';
import { isFunction, isPlainObject } from '@videojs/utils/predicate';

import { definePlayerFeature } from '../../feature';

export interface UserPreferencesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface UserPreferencesFeatureConfig {
  /** Storage key for persisted media user preferences. */
  key?: string | undefined;
  /** Storage backend. Defaults to `localStorage` when available. */
  storage?: UserPreferencesStorage | undefined;
}

export interface UserPreferencesState {
  userPreferences: Record<string, unknown>;
  getUserPreference<Value = unknown>(key: string): Value | undefined;
  setUserPreference(key: string, value: unknown): void;
}

const DEFAULT_KEY = 'media:user-preferences';

export const userPreferencesFeature = definePlayerFeature(
  {
    name: 'userPreferences',
    state: ({ get, set }, config: UserPreferencesFeatureConfig): UserPreferencesState => {
      const key = config.key ?? DEFAULT_KEY;
      const storage = getStorage(config.storage);

      return {
        userPreferences: storage ? read(storage, key) : {},
        getUserPreference<Value = unknown>(prefKey: string): Value | undefined {
          return getUserPreference(get(), prefKey);
        },
        setUserPreference(prefKey: string, value: unknown): void {
          const current = get().userPreferences;
          const prefs = isPlainObject(current) ? current : {};
          const next = { ...prefs };

          if (value === undefined) {
            delete next[prefKey];
          } else {
            next[prefKey] = value;
          }

          set({ userPreferences: next });
          if (storage) write(storage, key, next);
        },
      };
    },

    attach({ signal, get, set }, config: UserPreferencesFeatureConfig) {
      const key = config.key ?? DEFAULT_KEY;
      const storage = getStorage(config.storage);
      if (!storage) return;
      const prefsStorage = storage;

      const next = read(prefsStorage, key);
      if (stringify(get().userPreferences) !== stringify(next)) {
        set({ userPreferences: next });
      }

      if (prefsStorage === getLocalStorage() && typeof window !== 'undefined') {
        listen(
          window,
          'storage',
          (event) => {
            if (event.key !== key) return;
            if (event.newValue === null) {
              set({ userPreferences: {} });
              return;
            }

            const next = parseObject(event.newValue);
            if (!next) return;

            set({ userPreferences: next });
          },
          { signal }
        );
      }
    },
  },
  {} satisfies UserPreferencesFeatureConfig
);

function getStorage(storage?: UserPreferencesStorage): UserPreferencesStorage | null {
  if (storage) return storage;
  return getLocalStorage();
}

function getLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function read(storage: UserPreferencesStorage, key: string): Record<string, unknown> {
  try {
    const value = storage.getItem(key);
    if (!value) return {};
    return parseObject(value) ?? {};
  } catch {
    return {};
  }
}

function write(storage: UserPreferencesStorage, key: string, value: Record<string, unknown>): void {
  try {
    storage.setItem(key, stringify(value));
  } catch {}
}

function parseObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function stringify(value: unknown): string {
  return JSON.stringify(value);
}

export function getUserPreference<Value = unknown>(
  state: Readonly<{ userPreferences?: unknown }>,
  key: string
): Value | undefined {
  const prefs = state.userPreferences;
  if (!isPlainObject(prefs)) return undefined;
  return prefs[key] as Value | undefined;
}

export function setUserPreference(state: Readonly<{ setUserPreference?: unknown }>, key: string, value: unknown): void {
  const setter = state.setUserPreference;
  if (isFunction(setter)) setter(key, value);
}

export namespace userPreferencesFeature {
  export type Config = UserPreferencesFeatureConfig;
  export type Storage = UserPreferencesStorage;
  export type State = UserPreferencesState;
}
