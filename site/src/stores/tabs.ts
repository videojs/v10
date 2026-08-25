import { map } from 'nanostores';

/** Store for managing tabs state across Astro islands. Maps tabs ID to currently active tab value. */
export const $tabs = map<Record<string, string>>({});
