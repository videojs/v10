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
    sidebarLabel: 'Getting started',
    contents: [
      { slug: 'how-to/installation' },
      { slug: 'concepts/overview' },
      { slug: 'how-to/build-with-ai' },
      { slug: 'concepts/v10-roadmap', sidebarLabel: 'Roadmap' },
    ],
  },
  {
    sidebarLabel: 'Concepts',
    contents: [
      { slug: 'concepts/features' },
      { slug: 'concepts/skins' },
      { slug: 'concepts/presets' },
      { slug: 'concepts/ui-components' },
      { slug: 'concepts/accessibility' },
    ],
  },
  {
    sidebarLabel: 'How to',
    contents: [{ slug: 'how-to/customize-skins' }],
  },
  {
    sidebarLabel: 'Components',
    contents: [
      { slug: 'reference/player-provider' },
      { slug: 'reference/player-container' },
      // sorted alphabetically
      { slug: 'reference/buffering-indicator' },
      { slug: 'reference/captions-button' },
      { slug: 'reference/controls' },
      { slug: 'reference/fullscreen-button' },
      { slug: 'reference/mute-button' },
      { slug: 'reference/pip-button' },
      { slug: 'reference/play-button' },
      { slug: 'reference/playback-rate-button' },
      { slug: 'reference/popover' },
      { slug: 'reference/poster' },
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
    sidebarLabel: 'Hooks & Utilities',
    frameworks: ['react'],
    contents: [
      { slug: 'reference/create-player' },
      { slug: 'reference/use-player' },
      { slug: 'reference/use-media' },
      { slug: 'reference/use-store' },
      {
        sidebarLabel: 'Advanced',
        defaultOpen: false,
        contents: [
          { slug: 'reference/render-element' },
          { slug: 'reference/use-button' },
          { slug: 'reference/use-container-attach' },
          { slug: 'reference/use-media-attach' },
          { slug: 'reference/use-player-context' },
          { slug: 'reference/use-selector' },
          { slug: 'reference/use-snapshot' },
        ],
      },
    ],
  },
  {
    sidebarLabel: 'Controllers & Mixins',
    frameworks: ['html'],
    contents: [
      { slug: 'reference/html-create-player', sidebarLabel: 'createPlayer' },
      { slug: 'reference/player-controller' },
      {
        sidebarLabel: 'Advanced',
        defaultOpen: false,
        contents: [
          { slug: 'reference/container-mixin' },
          { slug: 'reference/media-attach-mixin' },
          { slug: 'reference/player-context' },
          { slug: 'reference/provider-mixin' },
          { slug: 'reference/snapshot-controller' },
          { slug: 'reference/store-controller' },
        ],
      },
    ],
  },
  {
    sidebarLabel: 'Features',
    contents: [
      { slug: 'reference/create-selector' },
      { slug: 'reference/feature-buffer' },
      { slug: 'reference/feature-controls' },
      { slug: 'reference/feature-error' },
      { slug: 'reference/feature-fullscreen' },
      { slug: 'reference/feature-pip', sidebarLabel: 'Picture-in-picture' },
      { slug: 'reference/feature-playback' },
      { slug: 'reference/feature-playback-rate' },
      { slug: 'reference/feature-source' },
      { slug: 'reference/feature-text-tracks' },
      { slug: 'reference/feature-time' },
      { slug: 'reference/feature-volume' },
    ],
  },
];
