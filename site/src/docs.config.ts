import type { Sidebar } from '@/types/docs';

export const sidebar: Sidebar = [
  {
    sidebarLabel: 'Getting started',
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
      { slug: 'how-to/installation' },
      { slug: 'concepts/v10-roadmap', sidebarLabel: 'Roadmap' },
    ],
  },
  {
    sidebarLabel: 'Concepts',
    contents: [{ slug: 'concepts/architecture' }, { slug: 'concepts/skins' }, { slug: 'concepts/ui-components' }],
  },
  {
    sidebarLabel: 'How to',
    contents: [{ slug: 'how-to/customize-skins' }],
  },
  {
    sidebarLabel: 'Components',
    contents: [
      // sorted alphabetically
      { slug: 'reference/buffering-indicator' },
      { slug: 'reference/controls' },
      { slug: 'reference/fullscreen-button' },
      { slug: 'reference/mute-button' },
      { slug: 'reference/pip-button' },
      { slug: 'reference/play-button' },
      { slug: 'reference/poster' },
      { slug: 'reference/seek-button' },
      { slug: 'reference/time' },
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
          { slug: 'reference/merge-props' },
          { slug: 'reference/render-element' },
          { slug: 'reference/use-button' },
          { slug: 'reference/use-media-registration' },
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
      { slug: 'reference/player-mixin' },
      {
        sidebarLabel: 'Advanced',
        defaultOpen: false,
        contents: [
          { slug: 'reference/container-mixin' },
          { slug: 'reference/player-context' },
          { slug: 'reference/provider-mixin' },
          { slug: 'reference/snapshot-controller' },
          { slug: 'reference/store-controller' },
        ],
      },
    ],
  },
  {
    sidebarLabel: 'Selectors',
    contents: [
      { slug: 'reference/create-selector' },
      { slug: 'reference/select-buffer' },
      { slug: 'reference/select-controls' },
      { slug: 'reference/select-fullscreen' },
      { slug: 'reference/select-pip', sidebarLabel: 'selectPiP' },
      { slug: 'reference/select-playback' },
      { slug: 'reference/select-source' },
      { slug: 'reference/select-time' },
      { slug: 'reference/select-volume' },
    ],
  },
];
