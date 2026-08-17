import type { Sidebar } from '@/types/docs';

export const sidebar: Sidebar = [
  {
    sidebarLabel: 'Site development',
    devOnly: true,
    contents: [
      {
        slug: 'how-to/write-guides',
        sidebarLabel: 'Writing guides',
        devOnly: true,
      },
      {
        slug: 'reference/write-references',
        sidebarLabel: 'Writing references',
        devOnly: true,
      },
    ],
  },
  {
    // One reading order, top to bottom. The `concepts/` and `how-to/` directories are an
    // authoring distinction (Diátaxis mode); they are deliberately not a reader-facing one.
    sidebarLabel: 'Getting started',
    llmsDescription:
      'Read these in order to go from nothing to a player you understand: install it, learn how a player is put together, then learn each piece you are likely to reach for.',
    contents: [
      // Land and install.
      { slug: 'concepts/why-videojs' },
      { slug: 'how-to/installation' },
      { slug: 'concepts/overview' },
      // How a player is put together.
      { slug: 'concepts/presets' },
      { slug: 'concepts/skins' },
      { slug: 'concepts/ui-components' },
      { slug: 'concepts/features' },
      { slug: 'concepts/media-sources' },
      // Things every production player has to answer for.
      { slug: 'concepts/accessibility' },
      { slug: 'concepts/i18n', sidebarLabel: 'Internationalization' },
      { slug: 'concepts/security' },
      { slug: 'concepts/browser-support' },
      // Optional integrations.
      { slug: 'concepts/cast', sidebarLabel: 'Google Cast' },
      { slug: 'concepts/mux-data' },
      // Working with us.
      { slug: 'how-to/build-with-ai' },
      { slug: 'concepts/v10-roadmap', sidebarLabel: 'Roadmap' },
      { href: '/changelog', sidebarLabel: 'Changelog' },
    ],
  },
  {
    sidebarLabel: 'How to',
    llmsDescription:
      'Task-oriented guides with step-by-step instructions to achieve a specific outcome. Each guide may assume you have already read the relevant Getting started pages.',
    contents: [
      { slug: 'how-to/customize-skins' },
      { slug: 'how-to/build-your-own-component' },
      { slug: 'how-to/self-host-the-player', frameworks: ['html'] },
      {
        sidebarLabel: 'Internationalization',
        defaultOpen: false,
        contents: [
          { slug: 'reference/translation-phrases', sidebarLabel: 'Translation keys' },
          { slug: 'how-to/i18n-register-locale', sidebarLabel: 'Register a locale' },
          { slug: 'how-to/i18n-override-translations', sidebarLabel: 'Override translations' },
          { slug: 'how-to/i18n-switch-locale', sidebarLabel: 'Switch locale' },
          { slug: 'how-to/i18n-ssr', sidebarLabel: 'SSR with locale' },
        ],
      },
    ],
  },
  {
    sidebarLabel: 'API Reference',
    llmsDescription:
      'Reference for every public export, grouped by what it is: UI components, media components, player features, and utilities.',
    contents: [
      {
        sidebarLabel: 'UI Components',
        defaultOpen: false,
        llmsDescription: 'API Reference for UI components for building media player interfaces.',
        contents: [
          { slug: 'reference/player-provider' },
          { slug: 'reference/player-container' },
          { slug: 'reference/i18n-provider', frameworks: ['react'] },
          // sorted alphabetically
          { slug: 'reference/airplay-button' },
          { slug: 'reference/audio-track-radio-group' },
          { slug: 'reference/buffering-indicator' },
          { slug: 'reference/captions-button' },
          { slug: 'reference/captions-radio-group' },
          { slug: 'reference/cast-button' },
          { slug: 'reference/controls' },
          { slug: 'reference/fullscreen-button' },
          { slug: 'reference/google-cast' },
          { slug: 'reference/menu' },
          { slug: 'reference/mute-button' },
          { slug: 'reference/mux-data' },
          { slug: 'reference/pip-button' },
          { slug: 'reference/play-button' },
          { slug: 'reference/playback-rate-button' },
          { slug: 'reference/playback-rate-radio-group' },
          { slug: 'reference/popover' },
          { slug: 'reference/poster' },
          { slug: 'reference/quality-radio-group' },
          { slug: 'reference/seek-button' },
          { slug: 'reference/slider' },
          { slug: 'reference/thumbnail' },
          { slug: 'reference/time' },
          { slug: 'reference/time-slider' },
          { slug: 'reference/tooltip' },
          { slug: 'reference/volume-slider' },
        ],
      },
      {
        sidebarLabel: 'Media Components',
        defaultOpen: false,
        llmsDescription: 'API Reference for media components that handle streaming protocols and media playback.',
        contents: [
          { slug: 'reference/background-video' },
          { slug: 'reference/dash-video' },
          { slug: 'reference/hls-audio' },
          { slug: 'reference/hls-video' },
          { slug: 'reference/hlsjs-video' },
          { slug: 'reference/mux-audio' },
          { slug: 'reference/mux-video' },
          { slug: 'reference/native-hls-video' },
        ],
      },
      {
        sidebarLabel: 'Player Features',
        defaultOpen: false,
        llmsDescription:
          'API reference for the feature modules passed to createPlayer, which provide player capabilities and state.',
        contents: [
          { slug: 'reference/create-selector' },
          { slug: 'reference/feature-buffer' },
          { slug: 'reference/feature-controls' },
          { slug: 'reference/feature-error' },
          { slug: 'reference/feature-fullscreen' },
          { slug: 'reference/feature-live' },
          { slug: 'reference/feature-orientation-lock' },
          { slug: 'reference/feature-pip', sidebarLabel: 'Picture-in-picture' },
          { slug: 'reference/feature-playback' },
          { slug: 'reference/feature-playback-rate' },
          { slug: 'reference/feature-quality' },
          { slug: 'reference/feature-audio-track' },
          { slug: 'reference/feature-remote-playback' },
          { slug: 'reference/feature-source' },
          { slug: 'reference/feature-stream-type' },
          { slug: 'reference/feature-text-tracks' },
          { slug: 'reference/feature-time' },
          { slug: 'reference/feature-volume' },
        ],
      },
      {
        sidebarLabel: 'Utilities',
        defaultOpen: false,
        llmsDescription:
          'API reference for the hooks, utilities, controllers, and mixins used to integrate a player into an application.',
        // Flat by design: commonly used entries first, then the rest. Framework-specific
        // entries carry their own `frameworks`, so each framework sees one coherent list.
        contents: [
          { slug: 'reference/create-player', frameworks: ['react'] },
          { slug: 'reference/html-create-player', sidebarLabel: 'createPlayer', frameworks: ['html'] },
          { slug: 'reference/player-controller', frameworks: ['html'] },
          { slug: 'reference/use-player', frameworks: ['react'] },
          { slug: 'reference/use-media', frameworks: ['react'] },
          { slug: 'reference/use-store', frameworks: ['react'] },
          { slug: 'reference/create-i18n' },
          { slug: 'reference/use-translator', frameworks: ['react'] },
          { slug: 'reference/use-locale', frameworks: ['react'] },
          { slug: 'reference/media-i18n', sidebarLabel: 'media-i18n', frameworks: ['html'] },
          { slug: 'reference/media-text', sidebarLabel: 'media-text', frameworks: ['html'] },
          // Less commonly reached for
          { slug: 'reference/register-i18n', sidebarLabel: 'registerI18n' },
          { slug: 'reference/get-i18n-translations', sidebarLabel: 'getI18nTranslations' },
          { slug: 'reference/has-registered-locale', sidebarLabel: 'hasRegisteredLocale' },
          { slug: 'reference/on-i18n-registry-change', sidebarLabel: 'onI18nRegistryChange' },
          { slug: 'reference/create-translator', sidebarLabel: 'createTranslator' },
          { slug: 'reference/render-element', frameworks: ['react'] },
          { slug: 'reference/use-audio-track-options', frameworks: ['react'] },
          { slug: 'reference/use-button', frameworks: ['react'] },
          { slug: 'reference/use-captions-options', frameworks: ['react'] },
          { slug: 'reference/use-container-attach', frameworks: ['react'] },
          { slug: 'reference/use-media-attach', frameworks: ['react'] },
          { slug: 'reference/use-playback-rate-options', frameworks: ['react'] },
          { slug: 'reference/use-player-context', frameworks: ['react'] },
          { slug: 'reference/use-quality-options', frameworks: ['react'] },
          { slug: 'reference/use-selector', frameworks: ['react'] },
          { slug: 'reference/use-snapshot', frameworks: ['react'] },
          { slug: 'reference/container-mixin', frameworks: ['html'] },
          { slug: 'reference/media-attach-mixin', frameworks: ['html'] },
          { slug: 'reference/player-context', frameworks: ['html'] },
          { slug: 'reference/provider-mixin', frameworks: ['html'] },
          { slug: 'reference/snapshot-controller', frameworks: ['html'] },
          { slug: 'reference/store-controller', frameworks: ['html'] },
        ],
      },
    ],
  },
];
