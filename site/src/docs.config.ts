import type { Sidebar } from '@/types/docs';

/**
 * Top-level sections render as tabs at the top of the docs sidebar ("Guide", "Components"). Everything below a tab
 * renders flat: second-level sections are headings, third-level sections are sub-headings. There is nothing to expand
 * or collapse.
 */
export const sidebar: Sidebar = [
  {
    sidebarLabel: 'Guides',
    llmsDescription: 'Installation, migration, concepts, playback guides, customization, and tooling for Video.js.',
    contents: [
      {
        sidebarLabel: 'Getting Started',
        llmsDescription: 'Install Video.js and understand its main pieces.',
        contents: [
          { slug: 'guides/installation' },
          { slug: 'guides/installation-vue', sidebarLabel: 'Install with Vue', frameworks: ['html'], hidden: true },
          {
            slug: 'guides/installation-svelte',
            sidebarLabel: 'Install with Svelte',
            frameworks: ['html'],
            hidden: true,
          },
          { slug: 'concepts/overview' },
          { slug: 'concepts/why-videojs' },
          { slug: 'concepts/v10-roadmap', sidebarLabel: 'Roadmap' },
        ],
      },
      {
        sidebarLabel: 'Tooling',
        llmsDescription:
          'Guidance for AI tools, browser support, TypeScript, bundlers, the CDN, self-hosting, and contributing.',
        contents: [
          { slug: 'guides/build-with-ai' },
          { slug: 'concepts/browser-support' },
          { slug: 'concepts/typescript' },
          { slug: 'concepts/bundlers' },
          { slug: 'concepts/cdn', frameworks: ['html'] },
          { slug: 'guides/self-host-the-player', sidebarLabel: 'Self-hosting', frameworks: ['html'] },
          { href: 'https://github.com/videojs/v10/blob/main/CONTRIBUTING.md', sidebarLabel: 'Contribute to Video.js' },
        ],
      },
      {
        sidebarLabel: 'Migrate',
        llmsDescription:
          'Guides for moving an existing player integration to Video.js v10, one per player you might be coming from.',
        contents: [
          { slug: 'guides/migrate-from-video-js-8', sidebarLabel: 'From Video.js 8' },
          { slug: 'guides/migrate-from-mux-player', sidebarLabel: 'From Mux Player' },
          { slug: 'guides/migrate-from-plyr', sidebarLabel: 'From Plyr' },
          { slug: 'guides/migrate-from-media-chrome', sidebarLabel: 'From Media Chrome' },
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
          { slug: 'concepts/media-sources' },
          { slug: 'concepts/mux-data' },
          { slug: 'concepts/security' },
          { slug: 'concepts/custom-element-lifecycle', frameworks: ['html'] },
        ],
      },
      {
        sidebarLabel: 'Customize',
        llmsDescription: 'Guides for changing what the player looks like and building your own controls.',
        contents: [
          { slug: 'guides/customize-skins', sidebarLabel: 'Customize skins' },
          { slug: 'guides/build-your-own-component', sidebarLabel: 'Build a component' },
        ],
      },
      {
        sidebarLabel: 'Playback',
        llmsDescription:
          'Guides for one player capability each: the recommended setup, how it works, browser constraints, variations, and troubleshooting.',
        contents: [
          { slug: 'guides/autoplay', sidebarLabel: 'Autoplay' },
          { slug: 'guides/show-and-hide-controls', sidebarLabel: 'Controls' },
          { slug: 'guides/add-a-poster-and-loading-placeholder', sidebarLabel: 'Poster and placeholder' },
          { slug: 'guides/show-captions-and-subtitles', sidebarLabel: 'Captions and subtitles' },
          { slug: 'guides/add-keyboard-shortcuts-and-gestures', sidebarLabel: 'Keyboard shortcuts and gestures' },
          { slug: 'guides/play-live-streams', sidebarLabel: 'Live streams' },
          { slug: 'guides/add-quality-selector', sidebarLabel: 'Quality selector' },
          { slug: 'guides/go-fullscreen-and-lock-orientation', sidebarLabel: 'Fullscreen and orientation' },
          { slug: 'guides/use-picture-in-picture', sidebarLabel: 'Picture-in-picture' },
          { slug: 'guides/show-timeline-thumbnail-previews', sidebarLabel: 'Thumbnail previews' },
          { slug: 'guides/cast-to-airplay-and-chromecast', sidebarLabel: 'AirPlay and Chromecast' },
          { slug: 'guides/handle-playback-errors', sidebarLabel: 'Playback errors' },
          { slug: 'guides/remember-user-preferences', sidebarLabel: 'User preferences' },
          { slug: 'guides/add-a-background-video', sidebarLabel: 'Background video' },
          { slug: 'guides/internationalize-the-player', sidebarLabel: 'Internationalization' },
        ],
      },
      {
        sidebarLabel: 'Frameworks',
        frameworks: ['html'],
        llmsDescription: 'Guides for using the HTML version of Video.js with Vue, Nuxt, Svelte, or SvelteKit.',
        contents: [
          { slug: 'guides/use-videojs-with-vue', sidebarLabel: 'Vue and Nuxt' },
          { slug: 'guides/use-videojs-with-svelte', sidebarLabel: 'Svelte and SvelteKit' },
        ],
      },
    ],
  },
  {
    sidebarLabel: 'Components',
    llmsDescription: 'API reference for skins, media components, extensions, and interface components.',
    contents: [
      {
        sidebarLabel: 'Skins',
        llmsDescription: 'API reference for the packaged skins each preset ships.',
        contents: [
          { slug: 'components/video-skin' },
          { slug: 'components/video-minimal-skin' },
          { slug: 'components/audio-skin' },
          { slug: 'components/audio-minimal-skin' },
          { slug: 'components/live-video-skin' },
          { slug: 'components/live-video-minimal-skin' },
          { slug: 'components/live-audio-skin' },
          { slug: 'components/live-audio-minimal-skin' },
          { slug: 'components/background-video-skin' },
        ],
      },
      {
        sidebarLabel: 'Media',
        llmsDescription: 'API reference for media components that handle streaming protocols and playback.',
        contents: [
          { slug: 'components/audio' },
          { slug: 'components/background-video' },
          { slug: 'components/cloudflare-video' },
          { slug: 'components/dash-video' },
          { slug: 'components/hls-audio' },
          { slug: 'components/hls-background-video' },
          { slug: 'components/hls-video' },
          { slug: 'components/hlsjs-video' },
          { slug: 'components/mux-audio' },
          { slug: 'components/mux-background-video' },
          { slug: 'components/mux-video' },
          { slug: 'components/native-hls-video' },
          { slug: 'components/shaka-video' },
          { slug: 'components/spotify-audio' },
          { slug: 'components/tiktok-video' },
          { slug: 'components/twitch-video' },
          { slug: 'components/video' },
          { slug: 'components/vimeo-video' },
          { slug: 'components/wistia-video' },
          { slug: 'components/youtube-video' },
        ],
      },
      {
        sidebarLabel: 'Extensions',
        llmsDescription: 'API reference for extensions that connect external services to the player.',
        contents: [{ slug: 'components/google-cast' }, { slug: 'components/mux-data' }],
      },
      {
        sidebarLabel: 'Layout',
        llmsDescription: 'API reference for the components that establish a player and lay out its interface.',
        contents: [
          { slug: 'components/player' },
          { slug: 'components/player-container' },
          { slug: 'components/controls' },
        ],
      },
      {
        sidebarLabel: 'Buttons',
        llmsDescription: 'API reference for the button components that trigger playback actions.',
        contents: [
          { slug: 'components/play-button' },
          { slug: 'components/mute-button' },
          { slug: 'components/seek-button' },
          { slug: 'components/fullscreen-button' },
          { slug: 'components/pip-button' },
          { slug: 'components/captions-button' },
          { slug: 'components/playback-rate-button' },
          { slug: 'components/live-button' },
          { slug: 'components/airplay-button' },
          { slug: 'components/cast-button' },
        ],
      },
      {
        sidebarLabel: 'Sliders',
        llmsDescription: 'API reference for the slider components that scrub time and adjust volume.',
        contents: [
          { slug: 'components/slider' },
          { slug: 'components/time-slider' },
          { slug: 'components/volume-slider' },
        ],
      },
      {
        sidebarLabel: 'Menus',
        llmsDescription:
          'API reference for menus, popovers, and the radio groups that pick tracks, quality, and speed.',
        contents: [
          { slug: 'components/menu' },
          { slug: 'components/popover' },
          { slug: 'components/volume-popover' },
          { slug: 'components/audio-track-radio-group' },
          { slug: 'components/captions-radio-group' },
          { slug: 'components/playback-rate-radio-group' },
          { slug: 'components/quality-radio-group' },
        ],
      },
      {
        sidebarLabel: 'Display',
        llmsDescription: 'API reference for components that display player state, media metadata, and previews.',
        contents: [
          { slug: 'components/time' },
          { slug: 'components/title' },
          { slug: 'components/poster' },
          { slug: 'components/thumbnail' },
          { slug: 'components/tooltip' },
          { slug: 'components/buffering-indicator' },
          { slug: 'components/seek-indicator' },
          { slug: 'components/status-indicator' },
          { slug: 'components/volume-indicator' },
        ],
      },
      {
        sidebarLabel: 'Dialogs',
        llmsDescription: 'API reference for modal dialogs, alerts, and playback error surfaces.',
        contents: [
          { slug: 'components/dialog' },
          { slug: 'components/alert-dialog' },
          { slug: 'components/error-dialog' },
        ],
      },
      {
        sidebarLabel: 'Behavior',
        llmsDescription: 'API reference for the non-visual components that add gestures, hotkeys, and announcements.',
        contents: [
          { slug: 'components/gesture' },
          { slug: 'components/hotkey' },
          { slug: 'components/status-announcer' },
        ],
      },
    ],
  },
  {
    sidebarLabel: 'API',
    llmsDescription:
      'API reference for the player factory, store, features, media, menus, overlays, gestures, translation tools, and utilities.',
    contents: [
      {
        sidebarLabel: 'Player',
        llmsDescription:
          'API reference for creating a player and reaching it, its container, and its context from your own code.',
        contents: [
          { slug: 'api/create-player', frameworks: ['react'] },
          { slug: 'api/html-create-player', sidebarLabel: 'createPlayer', frameworks: ['html'] },
          { slug: 'api/player-controller', frameworks: ['html'] },
          { slug: 'api/use-player', frameworks: ['react'] },
          { slug: 'api/use-optional-player', frameworks: ['react'] },
          { slug: 'api/use-player-context', frameworks: ['react'] },
          { slug: 'api/player-context', frameworks: ['html'] },
          { slug: 'api/use-container', frameworks: ['react'] },
          { slug: 'api/use-optional-container', frameworks: ['react'] },
          { slug: 'api/use-container-attach', frameworks: ['react'] },
        ],
      },
      {
        sidebarLabel: 'Store',
        llmsDescription:
          'API reference for reading and subscribing to player state: selectors, snapshots, and the store controllers.',
        contents: [
          { slug: 'api/create-selector' },
          { slug: 'api/use-store', frameworks: ['react'] },
          { slug: 'api/use-selector', frameworks: ['react'] },
          { slug: 'api/use-snapshot', frameworks: ['react'] },
          { slug: 'api/store-controller', frameworks: ['html'] },
          { slug: 'api/snapshot-controller', frameworks: ['html'] },
          { slug: 'api/subscription-controller', frameworks: ['html'] },
        ],
      },
      {
        sidebarLabel: 'Features',
        llmsDescription:
          'API reference for the feature modules passed to createPlayer, which provide player capabilities and state.',
        contents: [
          { slug: 'api/feature-buffer' },
          { slug: 'api/feature-controls' },
          { slug: 'api/feature-error' },
          { slug: 'api/feature-fullscreen' },
          { slug: 'api/feature-live' },
          { slug: 'api/feature-metadata' },
          { slug: 'api/feature-orientation-lock' },
          { slug: 'api/feature-pip', sidebarLabel: 'Picture-in-picture' },
          { slug: 'api/feature-playback' },
          { slug: 'api/feature-playback-rate' },
          { slug: 'api/feature-quality' },
          { slug: 'api/feature-audio-track' },
          { slug: 'api/feature-remote-playback' },
          { slug: 'api/feature-source' },
          { slug: 'api/feature-stream-type' },
          { slug: 'api/feature-text-tracks' },
          { slug: 'api/feature-time' },
          { slug: 'api/feature-volume' },
        ],
      },
      {
        sidebarLabel: 'Media',
        llmsDescription: 'API reference for reaching the media element and attaching media or extensions to it.',
        contents: [
          { slug: 'api/use-media', frameworks: ['react'] },
          { slug: 'api/use-media-instance', frameworks: ['react'] },
          { slug: 'api/use-media-attach', frameworks: ['react'] },
          { slug: 'api/use-attach-media', frameworks: ['react'] },
          { slug: 'api/use-media-extension', frameworks: ['react'] },
          { slug: 'api/media-attach-mixin', frameworks: ['html'] },
        ],
      },
      {
        sidebarLabel: 'Menu',
        frameworks: ['react'],
        llmsDescription:
          'API reference for menu context and the option lists behind the track, quality, and speed menus.',
        contents: [
          { slug: 'api/use-menu-context', frameworks: ['react'] },
          { slug: 'api/use-optional-menu-context', frameworks: ['react'] },
          { slug: 'api/use-audio-track-options', frameworks: ['react'] },
          { slug: 'api/use-captions-options', frameworks: ['react'] },
          { slug: 'api/use-playback-rate-options', frameworks: ['react'] },
          { slug: 'api/use-quality-options', frameworks: ['react'] },
        ],
      },
      {
        sidebarLabel: 'Overlays',
        frameworks: ['react'],
        llmsDescription: 'API reference for dialog, popover, and tooltip context hooks.',
        contents: [
          { slug: 'api/use-dialog-context', frameworks: ['react'] },
          { slug: 'api/use-error-dialog-context', frameworks: ['react'] },
          { slug: 'api/use-popover-context', frameworks: ['react'] },
          { slug: 'api/use-tooltip-context', frameworks: ['react'] },
        ],
      },
      {
        sidebarLabel: 'Gestures',
        frameworks: ['react'],
        llmsDescription: 'API reference for tap and double-tap gestures and keyboard hotkeys.',
        contents: [
          { slug: 'api/use-tap-gesture', frameworks: ['react'] },
          { slug: 'api/use-double-tap-gesture', frameworks: ['react'] },
          { slug: 'api/use-hotkey', frameworks: ['react'] },
          { slug: 'api/use-hotkey-shortcut', frameworks: ['react'] },
        ],
      },
      {
        sidebarLabel: 'i18n',
        llmsDescription:
          'API reference for translating the player: providers, hooks, elements, the phrase registry, and contexts.',
        contents: [
          { slug: 'api/i18n-provider', frameworks: ['react'] },
          { slug: 'api/create-i18n' },
          { slug: 'api/use-translator', frameworks: ['react'] },
          { slug: 'api/use-locale', frameworks: ['react'] },
          { slug: 'api/media-i18n', sidebarLabel: 'media-i18n', frameworks: ['html'] },
          { slug: 'api/media-text', sidebarLabel: 'media-text', frameworks: ['html'] },
          { slug: 'api/translation-phrases', sidebarLabel: 'Translation keys' },
          { slug: 'api/register-i18n', sidebarLabel: 'registerI18n' },
          { slug: 'api/get-i18n-translations', sidebarLabel: 'getI18nTranslations' },
          { slug: 'api/has-registered-locale', sidebarLabel: 'hasRegisteredLocale' },
          { slug: 'api/on-i18n-registry-change', sidebarLabel: 'onI18nRegistryChange' },
          { slug: 'api/create-translator', sidebarLabel: 'createTranslator' },
          { slug: 'api/i-18-n-context', sidebarLabel: 'I18nContext', frameworks: ['react'] },
          { slug: 'api/html-i-18-n-context', sidebarLabel: 'i18nContext', frameworks: ['html'] },
          { slug: 'api/i-18-n-controller', sidebarLabel: 'I18nController', frameworks: ['html'] },
        ],
      },
      {
        sidebarLabel: 'Utils',
        llmsDescription:
          'Lower-level building blocks for custom components: refs, buttons, sliders, rendering, and keyboard shortcut controllers.',
        contents: [
          { slug: 'api/use-button', frameworks: ['react'] },
          { slug: 'api/use-slider', frameworks: ['react'] },
          { slug: 'api/use-composed-refs', frameworks: ['react'] },
          { slug: 'api/use-latest-ref', frameworks: ['react'] },
          { slug: 'api/use-destroy', frameworks: ['react'] },
          { slug: 'api/merge-props', frameworks: ['react'] },
          { slug: 'api/render-element', frameworks: ['react'] },
          { slug: 'api/aria-key-shortcuts-controller', frameworks: ['html'] },
        ],
      },
    ],
  },
  {
    sidebarLabel: 'Writing Style',
    devOnly: true,
    llmsDescription: 'Guides for people writing this documentation site.',
    contents: [
      {
        sidebarLabel: 'Authoring',
        contents: [
          { slug: 'writing-style/write-guides', sidebarLabel: 'Writing guides' },
          { slug: 'writing-style/write-references', sidebarLabel: 'Writing references' },
        ],
      },
    ],
  },
];
