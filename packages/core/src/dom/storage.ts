export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export const VJS_PREF_VOLUME = 'vjs-pref-volume';
export const VJS_PREF_MUTED = 'vjs-pref-muted';
