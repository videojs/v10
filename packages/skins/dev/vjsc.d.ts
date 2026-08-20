declare module '*.css';

declare module 'virtual:vjsc/skin/react/default-video/*.tsx' {
  export const css: string;
  export const DefaultVideoSkin: import('react').ComponentType<
    import('react').PropsWithChildren<{ className?: string }>
  >;
}

declare module 'virtual:vjsc/skin/react/minimal-video/*.tsx' {
  export const css: string;
  export const MinimalVideoSkin: import('react').ComponentType<
    import('react').PropsWithChildren<{ className?: string }>
  >;
}

declare module 'virtual:vjsc/skin/html/*.tsx' {
  export const css: string;
  export const skin: string;
}
