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
      { slug: 'reference/controls' },
      { slug: 'reference/fullscreen-button' },
      { slug: 'reference/mute-button' },
      { slug: 'reference/play-button' },
      { slug: 'reference/poster' },
      { slug: 'reference/time' },
    ],
  },
];
