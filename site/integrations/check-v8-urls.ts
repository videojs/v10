import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

// Video.js v8 URLs to check for migration status
const V8_URLS = [
  'https://videojs.org/city',
  'https://videojs.org/fantasy',
  'https://videojs.org/forest',
  'https://videojs.org/sea',
  'https://videojs.org/getting-started/',
  'https://videojs.org/blog/videojs-8-and-vhs-3/',
  'https://videojs.org/blog/announcing-the-new-videojs-com/',
  'https://videojs.org/blog/inband-captions-support-with-vhs/',
  'https://videojs.org/blog/video-js-7-4/',
  'https://videojs.org/blog/bugpost-disconnects-and-reconnects/',
  'https://videojs.org/blog/introducing-video-js-http-streaming-vhs/',
  'https://videojs.org/blog/video-js-7-3-responsive-layout-fill-mode-createLogger/',
  'https://videojs.org/blog/video-js-7-1-and-6-11-autoplay-and-fullscreen-changes/',
  'https://videojs.org/blog/video-js-7-is-here/',
  'https://videojs.org/blog/autoplay-best-practices-with-video-js/',
  'https://videojs.org/blog/videojs-contrib-ads-6/',
  'https://videojs.org/blog/video-js-7-roadmap/',
  'https://videojs.org/blog/videojs-vr-now-under-the-video-js-org/',
  'https://videojs.org/blog/video-js-6-7-1-released/',
  'https://videojs.org/blog/video-js-6-5-0-release/',
  'https://videojs.org/blog/video-js-6-4-0-release/',
  'https://videojs.org/blog/video-js-6-0-release/',
  'https://videojs.org/blog/feature-spotlight-middleware/',
  'https://videojs.org/blog/video-js-removes-flash-from-core-player/',
  'https://videojs.org/blog/feature-spotlight-accessibility/',
  'https://videojs.org/blog/feature-spotlight-advanced-plugins/',
  'https://videojs.org/blog/video-js-6-0-0-rc-0-the-first-rc/',
  'https://videojs.org/blog/introducing-thumbcoil/',
  'https://videojs.org/blog/video-js-5-12-0-and-5-11-5-releases/',
  'https://videojs.org/blog/the-end-of-html-first/',
  'https://videojs.org/blog/video-js-5-11-0-prelease/',
  'https://videojs.org/blog/video-js-5-s-fluid-mode-and-playlist-picker/',
  "https://videojs.org/blog/video-js-5-the-only-thing-that's-changed-is-everything-except-for-like-3-things-that-didn-t-including-the-name/",
  'https://videojs.org/blog/it-s-here-5-0-release-candidates/',
  'https://videojs.org/blog/video-js-4-12-the-last-of-the-4-minors/',
  'https://videojs.org/blog/video-js-4-9-now-can-join-the-party/',
  'https://videojs.org/blog/video-js-4-8-0-released-prost/',
  'https://videojs.org/blog/video-js-v4-7-0-built-mostly-by-new-contributors-also-google-chooses-video-js/',
  'https://videojs.org/blog/dash-everywhere-ish-hack-project/',
  'https://videojs.org/blog/video-js-version-4-6-0-released-it-s-been-a-productive-month/',
  'https://videojs.org/blog/video-js-version-4-5-0-released-nothing-to-see-here-move-along/',
  'https://videojs.org/blog/video-js-version-4-4-0-released-now-supporting-requirejs-and-browserify/',
  'https://videojs.org/blog/video-js-version-4-3-0-released-w-shiny-new-api-docs/',
  'https://videojs.org/blog/the-guardian-uses-video-js-in-feature-article/',
  'https://videojs.org/blog/4-2-2-patch-release/',
  'https://videojs.org/blog/running-video-js-unit-tests-in-real-browsers-with-karma/',
  'https://videojs.org/blog/unauthorized-modification-of-video-js-cdn-files/',
  'https://videojs.org/blog/video-js-4-2-0-released-rtmp-css-designer-and-stability/',
  'https://videojs.org/blog/hiding-and-showing-video-player-controls/',
  'https://videojs.org/blog/new-player-skin-designer-for-video-js/',
  'https://videojs.org/blog/video-js-4-1-0-released/',
  'https://videojs.org/blog/video-js-4-0-now-available/',
  'https://videojs.org/blog/repo-moved/',
  'https://videojs.org/blog/site-and-support-updates/',
  'https://videojs.org/blog/brightcove-acquires-zencoder/',
  'https://videojs.org/blog/version-3-2-update/',
  'https://videojs.org/blog/version-3-1-update/',
  'https://videojs.org/blog/video-js-version-3-0/',
  'https://videojs.org/blog/lynda-com-html5-video-tutorial-released/',
  'https://videojs.org/blog/how-are-you-using-video-js/',
  'https://videojs.org/blog/new-mpeg-la-webm-vp8-patent-pool/',
  'https://videojs.org/blog/apple-adds-airplay-to-mobile-safari/',
  'https://videojs.org/blog/google-is-dropping-h-264-from-chrome/',
  'https://videojs.org/blog/over-50-of-web-users-now-support-html5-video/',
  'https://videojs.org/blog/html5-video-google-maps-mashup/',
  'https://videojs.org/blog/2-0-2-release-subtitle-optimization-safari-on-leopard-fs-fix/',
  'https://videojs.org/blog/2-0-0-release-behaviors-fallback-apis-and-more/',
  'https://videojs.org/blog/make-sites-serve-you-html5-video-in-safari/',
  'https://videojs.org/blog/1-1-5-release-subtitles-using-track-android-fix-more/',
  'https://videojs.org/blog/version-1-1-4-release-css-loading-spinner-more/',
  'https://videojs.org/blog/version-1-1-3-release/',
  'https://videojs.org/blog/facebook-adds-html5-video/',
  'https://videojs.org/blog/ipad-iphone-video-poster-fix-bonus-javascript-placement-fix/',
  'https://videojs.org/blog/videojs-is-ie9-compatible/',
  'https://videojs.org/blog/new-videojs-site-now-with-more-html5/',
  'https://videojs.org/blog',
  'https://videojs.org/blog/2',
  'https://videojs.org/blog/3',
  'https://videojs.org/blog/4',
  'https://videojs.org/blog/5',
  'https://videojs.org/blog/6',
  'https://videojs.org/blog/7',
  'https://videojs.org/tags/news',
  'https://videojs.org/tags/vhs',
  'https://videojs.org/tags/videojs-http-streaming',
  'https://videojs.org/tags/playback',
  'https://videojs.org/tags/captions',
  'https://videojs.org/tags/cea-608',
  'https://videojs.org/tags/608',
  'https://videojs.org/tags/a11y',
  'https://videojs.org/tags/responsive',
  'https://videojs.org/tags/languages',
  'https://videojs.org/tags/live-ui',
  'https://videojs.org/tags/focus-visible',
  'https://videojs.org/tags/http-streaming',
  'https://videojs.org/tags/bugs',
  'https://videojs.org/tags/log',
  'https://videojs.org/tags/fill',
  'https://videojs.org/tags/fluid',
  'https://videojs.org/tags/playerresize',
  'https://videojs.org/tags/autoplay',
  'https://videojs.org/tags/fullscreen',
  'https://videojs.org/tags/IE8',
  'https://videojs.org/tags/IE',
  'https://videojs.org/tags/google%20analytics',
  'https://videojs.org/tags/VHS',
  'https://videojs.org/tags/HLS',
  'https://videojs.org/tags/DASH',
  'https://videojs.org/tags/webpack',
  'https://videojs.org/tags/rollup',
  'https://videojs.org/tags/vr',
  'https://videojs.org/tags/360',
  'https://videojs.org/tags/plugins',
  'https://videojs.org/tags/middleware',
  'https://videojs.org/tags/video.js%206.0',
  'https://videojs.org/tags/accessibility',
  'https://videojs.org/tags/flash',
  'https://videojs.org/tags/html5',
  'https://videojs.org/tags/thumbcoil',
  'https://videojs.org/tags/mse',
  'https://videojs.org/tags/hls',
  'https://videojs.org/tags/releases',
  'https://videojs.org/tags/version',
  'https://videojs.org/tags/babel',
  'https://videojs.org/tags/html5%20video',
  'https://videojs.org/tags/videojs%205',
  'https://videojs.org/tags/release',
  'https://videojs.org/tags/videojs',
  'https://videojs.org/tags/gallery',
  'https://videojs.org/tags/code',
  'https://videojs.org/tags/stats',
  'https://videojs.org/guides/angular/',
  'https://videojs.org/guides/audio-tracks/',
  'https://videojs.org/guides/components/',
  'https://videojs.org/guides/debugging/',
  'https://videojs.org/guides/embeds/',
  'https://videojs.org/guides/event-target/',
  'https://videojs.org/guides/faqs/',
  'https://videojs.org/guides/hooks/',
  'https://videojs.org/guides/languages/',
  'https://videojs.org/guides/layout/',
  'https://videojs.org/guides/live/',
  'https://videojs.org/guides/middleware/',
  'https://videojs.org/guides/modal-dialog/',
  'https://videojs.org/guides/picture-in-picture/',
  'https://videojs.org/guides/tech/',
  'https://videojs.org/guides/player-workflows/',
  'https://videojs.org/guides/react/',
  'https://videojs.org/guides/skins/',
  'https://videojs.org/guides/spatial-navigation/',
  'https://videojs.org/guides/text-tracks/',
  'https://videojs.org/guides/troubleshooting/',
  'https://videojs.org/guides/video-tracks/',
  'https://videojs.org/guides/videojs-7-to-8/',
  'https://videojs.org/guides/options/',
  'https://videojs.org/guides/plugins/',
  'https://videojs.org/guides/setup/',
  'https://videojs.org/guides/vue/',
  'https://videojs.org/guides/webpack/',
  'https://videojs.org/guides',
  'https://videojs.org/advanced/',
  'https://videojs.org/html5-video-support/',
  'https://videojs.org/',
  'https://videojs.org/plugins/',
  'https://videojs.org/privacy/',
];

interface V8UrlStatus {
  url: string;
  pathname: string;
  status: 'migrated' | 'redirected' | 'needs migration';
}

interface NetlifyRedirect {
  from: string;
  to: string;
  status: number;
}

function parseNetlifyToml(content: string): NetlifyRedirect[] {
  const redirects: NetlifyRedirect[] = [];
  const redirectRegex = /\[\[redirects\]\]\s+from\s*=\s*"([^"]+)"\s+to\s*=\s*"([^"]+)"\s+status\s*=\s*(\d+)/g;

  let match: RegExpExecArray | null;
  while ((match = redirectRegex.exec(content)) !== null) {
    redirects.push({
      from: match[1],
      to: match[2],
      status: parseInt(match[3], 10),
    });
  }

  return redirects;
}

function matchesNetlifyPattern(pathname: string, pattern: string): boolean {
  const normalizedPath = pathname.replace(/\/$/, '');
  const normalizedPattern = pattern.replace(/\/$/, '');

  if (normalizedPattern === normalizedPath) {
    return true;
  }

  // Handle * splat pattern (e.g., /tags/* matches /tags/anything)
  if (normalizedPattern.endsWith('/*')) {
    const prefix = normalizedPattern.slice(0, -2);
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  }

  return false;
}

export default function checkV8Urls(): AstroIntegration {
  return {
    name: 'check-v8-urls',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        // Convert URL to file path
        const buildDir = fileURLToPath(dir);

        // buildDir is dist/, so go up one level to site/
        const siteDir = resolve(buildDir, '..');
        const netlifyTomlPath = resolve(siteDir, 'netlify.toml');

        // Read netlify.toml redirects if it exists
        let netlifyRedirects: NetlifyRedirect[] = [];
        if (existsSync(netlifyTomlPath)) {
          try {
            const content = readFileSync(netlifyTomlPath, 'utf-8');
            netlifyRedirects = parseNetlifyToml(content);
          } catch {
            // Ignore parse errors
          }
        }

        // Check each URL
        const results: V8UrlStatus[] = [];

        for (const url of V8_URLS) {
          // Extract pathname from URL
          const urlObj = new URL(url);
          const pathname = decodeURIComponent(urlObj.pathname);

          // Check for HTML files
          const htmlPath1 = join(buildDir, `${pathname}.html`);
          const htmlPath2 = join(buildDir, pathname, 'index.html');

          let status: V8UrlStatus['status'] = 'needs migration';

          if (existsSync(htmlPath1) || existsSync(htmlPath2)) {
            status = 'migrated';
          } else {
            // Check for redirects in netlify.toml
            const hasNetlifyRedirect = netlifyRedirects.some((redirect) => {
              const isRedirect = redirect.status >= 301 && redirect.status <= 308;
              if (isRedirect) {
                return matchesNetlifyPattern(pathname, redirect.from);
              }
              return false;
            });

            if (hasNetlifyRedirect) {
              status = 'redirected';
            }
          }

          results.push({
            url,
            pathname,
            status,
          });
        }

        // Calculate statistics
        const total = results.length;
        const migrated = results.filter((r) => r.status === 'migrated').length;
        const redirected = results.filter((r) => r.status === 'redirected').length;
        const needsMigration = results.filter((r) => r.status === 'needs migration').length;

        const migratedPercent = ((migrated / total) * 100).toFixed(1);
        const redirectedPercent = ((redirected / total) * 100).toFixed(1);
        const needsMigrationPercent = ((needsMigration / total) * 100).toFixed(1);

        // Log results
        logger.info('');
        logger.info('V8 URL Migration Status');
        logger.info('========================');
        logger.info(`✅ Migrated: ${migrated}/${total} (${migratedPercent}%)`);
        logger.info(`🔀 Redirected: ${redirected}/${total} (${redirectedPercent}%)`);
        logger.info(`⚠️  Needs migration: ${needsMigration}/${total} (${needsMigrationPercent}%)`);
        logger.info('');

        // Log table
        logger.info('Status | URL');
        logger.info('------ | ---');

        const statusEmoji: Record<V8UrlStatus['status'], string> = {
          migrated: '✅',
          redirected: '🔀',
          'needs migration': '⚠️ ',
        };

        for (const result of results) {
          logger.info(`${statusEmoji[result.status]}     | ${result.pathname}`);
        }

        logger.info('');
      },
    },
  };
}
