import { DEFAULT_SRC } from './constants';

// Actions are persisted as query params so a configuration can be shared /
// restored. Booleans use "0" / "1".

export function readParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export function setParam(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (value === null || value === '') url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(window.history.state, '', url);
}

export function bool(value: boolean): string {
  return value ? '1' : '0';
}

export function getInitialSrc(): string {
  return readParams().get('src') || DEFAULT_SRC;
}

/** Derive a Mux poster image from a Mux stream URL, when applicable. */
export function posterFor(src: string): string | undefined {
  const match = src.match(/stream\.mux\.com\/([^/.]+)\.m3u8/);
  return match ? `https://image.mux.com/${match[1]}/thumbnail.webp` : undefined;
}
