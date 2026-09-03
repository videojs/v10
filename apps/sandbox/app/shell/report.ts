import { isString } from '@videojs/utils/predicate';
import { useEffect, useState } from 'react';

/** The preferences the skins react to. DevTools' rendering emulation flips them live. */
export const PREFERENCE_QUERIES = [
  ['reduced motion', '(prefers-reduced-motion: reduce)'],
  ['reduced transparency', '(prefers-reduced-transparency: reduce)'],
  ['more contrast', '(prefers-contrast: more)'],
  ['forced colors', '(forced-colors: active)'],
  ['hover', '(hover: hover)'],
  ['coarse pointer', '(pointer: coarse)'],
  ['dark scheme', '(prefers-color-scheme: dark)'],
] as const;

export type PreferenceName = (typeof PREFERENCE_QUERIES)[number][0];

export type Preferences = Readonly<Record<PreferenceName, boolean>>;

function readPreferences(): Preferences {
  // SAFETY: the object is built from every query name, so it carries every key of the record type.
  return Object.fromEntries(
    PREFERENCE_QUERIES.map(([name, query]) => [name, matchMedia(query).matches])
  ) as Preferences;
}

/** The detected preferences, kept current as the environment changes them. */
export function usePreferences(): Preferences {
  const [preferences, setPreferences] = useState(readPreferences);

  useEffect(() => {
    const update = () => setPreferences(readPreferences());
    const queries = PREFERENCE_QUERIES.map(([, query]) => matchMedia(query));

    for (const query of queries) query.addEventListener('change', update);

    return () => {
      for (const query of queries) query.removeEventListener('change', update);
    };
  }, []);

  return preferences;
}

/** An error one frame relayed, kept with where and when it happened. */
export interface RelayedError {
  readonly panel: string;
  readonly time: string;
  readonly message: string;
}

export const MAX_ERRORS = 10;

export function describeError(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;

  return isString(value) ? value : String(value);
}

export interface ReportInput {
  readonly url: string;
  readonly build: { readonly branch: string; readonly commit: string };
  readonly summary: string;
  /** Each panel's differing value and frame URL when comparing; empty otherwise. */
  readonly panels: readonly { readonly label: string; readonly url: string }[];
  readonly userAgent: string;
  readonly viewport: { readonly width: number; readonly height: number; readonly scale: number };
  readonly preferences: Preferences;
  readonly errors: readonly RelayedError[];
}

/** A markdown report of the preview for a bug report: what was shown, where, on what, and what went wrong. */
export function buildReport(input: ReportInput): string {
  const preferences = PREFERENCE_QUERIES.map(([name]) => `${name} ${input.preferences[name] ? 'on' : 'off'}`).join(
    ', '
  );
  const panels = input.panels.map((panel) => `  - ${panel.label}: ${panel.url}`);
  const errors = input.errors.map((error) => `  - ${error.time} ${error.panel}: ${error.message}`);

  return [
    '## Video.js sandbox preview',
    `- URL: ${input.url}`,
    `- Build: ${input.build.branch} @ ${input.build.commit}`,
    `- Selection: ${input.summary}`,
    ...(panels.length > 0 ? ['- Panels:', ...panels] : []),
    `- Browser: ${input.userAgent}`,
    `- Viewport: ${input.viewport.width}x${input.viewport.height} @ ${input.viewport.scale}x`,
    `- Preferences: ${preferences}`,
    errors.length > 0 ? `- Errors:\n${errors.join('\n')}` : '- Errors: none',
  ].join('\n');
}
