/// <reference types="vite/client" />

declare module '*&skin=default-video' {
  export const DefaultVideoSkin:
    | import('react').ComponentType<import('react').PropsWithChildren<{ className?: string }>>
    | ((props?: { className?: string }) => { toString(): string });
}

declare module '*&skin=minimal-video' {
  export const MinimalVideoSkin:
    | import('react').ComponentType<import('react').PropsWithChildren<{ className?: string }>>
    | ((props?: { className?: string }) => { toString(): string });
}

declare module '*&skin=default-live-video' {
  export const DefaultLiveVideoSkin:
    | import('react').ComponentType<import('react').PropsWithChildren<{ className?: string }>>
    | ((props?: { className?: string }) => { toString(): string });
}

declare module '*&skin=minimal-live-video' {
  export const MinimalLiveVideoSkin:
    | import('react').ComponentType<import('react').PropsWithChildren<{ className?: string }>>
    | ((props?: { className?: string }) => { toString(): string });
}

declare module '*&skin=default-audio' {
  export const DefaultAudioSkin:
    | import('react').ComponentType<import('react').PropsWithChildren<{ className?: string }>>
    | ((props?: { className?: string }) => { toString(): string });
}

declare module '*&skin=minimal-audio' {
  export const MinimalAudioSkin:
    | import('react').ComponentType<import('react').PropsWithChildren<{ className?: string }>>
    | ((props?: { className?: string }) => { toString(): string });
}
