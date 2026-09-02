/**
 * True when `packages/skins` is checked out beside the sandbox, so authored skins can be compiled. Set by
 * `vite.config.ts`.
 */
declare const __WORKSPACE_SKINS__: boolean;

declare module '*.css';

// Authored skin modules, addressed by the compiler query; their exports are checked at runtime by name.
declare module '*&skin=default-video';
declare module '*&skin=minimal-video';
declare module '*&skin=default-live-video';
declare module '*&skin=minimal-live-video';
declare module '*&skin=default-live-audio';
declare module '*&skin=minimal-live-audio';
declare module '*&skin=default-audio';
declare module '*&skin=minimal-audio';
