import { atom } from 'nanostores';

import type { RegistryStyling } from '@/utils/installation/shadcn';

/**
 * The styling catalog the registry commands point at. `null` means the framework's default: Tailwind for React, vanilla
 * CSS for HTML. Shared across islands so one select box drives every command on the page.
 */
export const registryStyling = atom<RegistryStyling | null>(null);
