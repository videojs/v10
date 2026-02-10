/**
 * Global type declarations for MediaSource APIs.
 */

/**
 * ManagedMediaSource is a newer Safari API not yet in standard DOM types.
 * Provides better lifecycle management for background tabs and picture-in-picture.
 */
declare global {
  interface ManagedMediaSource extends MediaSource {}

  const ManagedMediaSource:
    | {
        prototype: ManagedMediaSource;
        new (): ManagedMediaSource;
        isTypeSupported: (type: string) => boolean;
      }
    | undefined;
}

export {};
