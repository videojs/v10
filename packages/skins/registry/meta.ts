export interface VideojsRegistryMeta {
  readonly role: 'component' | 'media' | 'player' | 'skin' | 'support';
  readonly framework: 'html' | 'react';
  readonly styling?: 'css' | 'tailwind' | undefined;
  readonly preset?: 'audio' | 'live-audio' | 'live-video' | 'video' | undefined;
  readonly media?: 'audio' | 'video' | undefined;
  readonly variant?: 'default' | 'minimal' | undefined;
  readonly public: boolean;
}
