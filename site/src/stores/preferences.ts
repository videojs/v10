import { atom } from 'nanostores';
import type { AnySupportedStyle, SupportedFramework } from '@/types/docs';

/**
 * Nanostore atoms for current framework and style preferences.
 * These are the runtime cache of cookie values, kept in sync by PreferenceSync.
 * All React components should read from these stores for reactive updates.
 */
export const currentFramework = atom<SupportedFramework | null>(null);
export const currentStyle = atom<AnySupportedStyle | null>(null);
