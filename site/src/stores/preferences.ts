import { atom } from 'nanostores';
import type { AnySupportedStyle, SupportedFramework } from '@/types/docs';

/**
 * Nanostore atoms for current framework and style preferences.
 * Framework preference is kept in sync with cookies by PreferenceSync.
 * Style preference is read from localStorage and synced to DOM data-style.
 * All React components should read from these stores for reactive updates.
 */
export const currentFramework = atom<SupportedFramework | null>(null);
export const currentStyle = atom<AnySupportedStyle | null>(null);
