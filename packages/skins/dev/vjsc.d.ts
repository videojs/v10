declare module '*.css';

declare module 'virtual:vjsc/skin/react/default-video/*.tsx' {
  export const DefaultVideoSkin: import('react').ComponentType<
    import('react').PropsWithChildren<{ className?: string }>
  >;
}

declare module 'virtual:vjsc/skin/react/minimal-video/*.tsx' {
  export const MinimalVideoSkin: import('react').ComponentType<
    import('react').PropsWithChildren<{ className?: string }>
  >;
}

declare module 'virtual:vjsc/skin/html/*.tsx' {
  export function DefaultVideoSkin(props?: { className?: string }): { toString(): string };
  export function MinimalVideoSkin(props?: { className?: string }): { toString(): string };
}
