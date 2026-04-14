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
    // May change when we revisit this section's boundary with Concepts (#1105)
    llmsDescription: 'Installation, project setup, and introductory guides.',
    contents: [
      { slug: 'how-to/installation' },
      { slug: 'concepts/overview' },
      { slug: 'how-to/build-with-ai' },
      { slug: 'concepts/v10-roadmap', sidebarLabel: 'Roadmap' },
      { slug: 'concepts/browser-support' },
    ],
  },
  {
    sidebarLabel: 'Concepts',
    llmsDescription:
      'Understanding-oriented pages that explain how and why things work. Read these to build a mental model of the library.',
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
    llmsDescription:
      'Task-oriented guides with step-by-step instructions to achieve a specific outcome by applying one or more concepts. Each guide may assume you already understand the relevant concepts.',
    contents: [{ slug: 'how-to/customize-skins' }],
  },
  {
    sidebarLabel: 'Components',
    llmsDescription: 'API Reference for UI components for building media player interfaces.',
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
    llmsDescription: 'API Reference for React hooks and utilities for player integration.',
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
    llmsDescription: 'API Reference for controllers and mixins for HTML custom element integration.',
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
    llmsDescription: 'API reference for feature modules that provide player capabilities and state.',
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
