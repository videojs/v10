export const VideoCSSVars = {} as const;

export const AudioCSSVars = {} as const;

export function CustomMediaElement(_tag: string, _MediaHost: any): any {
  return class extends (globalThis.HTMLElement ?? class {}) {};
}
