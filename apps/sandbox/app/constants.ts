export const SKINS = ['default', 'minimal'] as const;
export const PLATFORMS = ['html', 'react', 'cdn'] as const;
export const STYLINGS = ['css', 'tailwind'] as const;
/** Where a skin's code and styles come from: the framework packages, a Shadcn registry install, or the authored sources. */
export const SKIN_SOURCES = ['package', 'registry', 'authored'] as const;
