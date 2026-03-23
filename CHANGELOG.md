# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### 🚀 Features
- *(skin)* Add error handling for audio players ([#1048](https://github.com/videojs/v10/pull/1048)) by [@sampotts](https://github.com/sampotts)

### 🐛 Bug Fixes
- *(docs)* Improvements to eject script ([#1012](https://github.com/videojs/v10/pull/1012)) by [@sampotts](https://github.com/sampotts)
- *(skin)* Extract transition properties into CSS custom properties ([#1075](https://github.com/videojs/v10/pull/1075)) by [@sampotts](https://github.com/sampotts)
- *(site)* Quote poster prop value in react demo code template ([#1079](https://github.com/videojs/v10/pull/1079)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Flatten error classes in ejected react skins ([#1080](https://github.com/videojs/v10/pull/1080)) by [@mihar-22](https://github.com/mihar-22)
- *(spf)* Implement preload IDL attribute on SpfMedia ([#1069](https://github.com/videojs/v10/pull/1069)) by [@cjpillsbury](https://github.com/cjpillsbury)
- *(spf)* Call sourceBuffer.abort() on AbortError to reset MSE parser state ([#1081](https://github.com/videojs/v10/pull/1081)) by [@cjpillsbury](https://github.com/cjpillsbury)

### 🚜 Refactor
- *(react)* Simplify skin render props with element form ([#1068](https://github.com/videojs/v10/pull/1068)) by [@mihar-22](https://github.com/mihar-22)

## [@videojs/core@10.0.0-beta.8] - 2026-03-20

### 🚀 Features
- *(site)* Migrate search from Pagefind to Algolia DocSearch v4 ([#941](https://github.com/videojs/v10/pull/941)) by [@decepulis](https://github.com/decepulis)

### 🐛 Bug Fixes
- *(site)* Redirect vjs10-site.netlify.app to videojs.org ([#1038](https://github.com/videojs/v10/pull/1038)) by [@decepulis](https://github.com/decepulis)
- *(html)* Template minifier stripping out default slot tags ([#1045](https://github.com/videojs/v10/pull/1045)) by [@mihar-22](https://github.com/mihar-22)
- *(docs)* Add missing DocsLinkCard import ([#1050](https://github.com/videojs/v10/pull/1050)) by [@sampotts](https://github.com/sampotts)
- *(docs)* Add DocsLinkCard import to the correct page ([#1051](https://github.com/videojs/v10/pull/1051)) by [@sampotts](https://github.com/sampotts)
- *(html)* Remove redundant CDN CSS files and inline background skin styles ([#1071](https://github.com/videojs/v10/pull/1071)) by [@mihar-22](https://github.com/mihar-22)

### 📚 Documentation
- *(site)* Add accessibility concepts page ([#1007](https://github.com/videojs/v10/pull/1007)) by [@decepulis](https://github.com/decepulis)
- *(site)* Add "Build with AI" guide ([#1005](https://github.com/videojs/v10/pull/1005)) by [@decepulis](https://github.com/decepulis)
- *(skin)* Add docs on skin styling ([#958](https://github.com/videojs/v10/pull/958)) by [@sampotts](https://github.com/sampotts)
- *(site)* Add browser support concept page ([#1035](https://github.com/videojs/v10/pull/1035)) by [@decepulis](https://github.com/decepulis)

### ⚙️ Miscellaneous Tasks
- *(root)* Migrate build scripts and plugins to TypeScript ([#1052](https://github.com/videojs/v10/pull/1052)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Add SPF to issue template package options ([#1058](https://github.com/videojs/v10/pull/1058)) by [@cjpillsbury](https://github.com/cjpillsbury)

## [@videojs/core@10.0.0-beta.7] - 2026-03-19

### 🚀 Features
- *(skin)* Add --media-color-primary customization ([#957](https://github.com/videojs/v10/pull/957)) by [@sampotts](https://github.com/sampotts)
- Add DashVideo media element (html, react) with sandbox support ([#940](https://github.com/videojs/v10/pull/940)) by [@cjpillsbury](https://github.com/cjpillsbury)
- *(sandbox)* Dynamically load skins by styling ([#989](https://github.com/videojs/v10/pull/989)) by [@sampotts](https://github.com/sampotts)
- *(packages)* Add poster component to video skins ([#994](https://github.com/videojs/v10/pull/994)) by [@sampotts](https://github.com/sampotts)
- *(html)* Add data-availability to volume slider ([#1001](https://github.com/videojs/v10/pull/1001)) by [@mihar-22](https://github.com/mihar-22)
- *(skin)* Add pip-enter and pip-exit icons ([#1015](https://github.com/videojs/v10/pull/1015)) by [@sampotts](https://github.com/sampotts)
- *(html)* Refactor attach contexts to carry state and setter ([#1024](https://github.com/videojs/v10/pull/1024)) by [@mihar-22](https://github.com/mihar-22)

### 🐛 Bug Fixes
- *(skin)* Bake in safari layout fix into skins ([#954](https://github.com/videojs/v10/pull/954)) by [@sampotts](https://github.com/sampotts)
- *(site)* Add /logo-white.png public asset ([#972](https://github.com/videojs/v10/pull/972)) by [@decepulis](https://github.com/decepulis)
- *(core)* Rename MediaDelegateMixin and MediaProxyMixin ([#976](https://github.com/videojs/v10/pull/976)) by [@luwes](https://github.com/luwes)
- Correct popup fallback positioning offsets ([#981](https://github.com/videojs/v10/pull/981)) by [@sampotts](https://github.com/sampotts)
- *(utils)* Handle missing media.querySelectorAll for HLS ([#986](https://github.com/videojs/v10/pull/986)) by [@sampotts](https://github.com/sampotts)
- *(skin)* Remove overflow in minimal video skin ([#993](https://github.com/videojs/v10/pull/993)) by [@sampotts](https://github.com/sampotts)
- *(skin)* Add subtle control transitions on touch devices ([#985](https://github.com/videojs/v10/pull/985)) by [@sampotts](https://github.com/sampotts)
- *(core)* Suppress tooltip hover on touch pointer events ([#933](https://github.com/videojs/v10/pull/933)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Stub pointer:fine in tooltip touch suppression tests ([#998](https://github.com/videojs/v10/pull/998)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Prevent slider thumb jump on pointer release ([#990](https://github.com/videojs/v10/pull/990)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Sync playback feature state on seeked event ([#1000](https://github.com/videojs/v10/pull/1000)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Improve fullscreen and pip webkit fallback handling ([#999](https://github.com/videojs/v10/pull/999)) by [@mihar-22](https://github.com/mihar-22)
- *(skin)* Fix HTML skin poster image alignment ([#1002](https://github.com/videojs/v10/pull/1002)) by [@sampotts](https://github.com/sampotts)
- *(site)* Add font metric overrides to reduce display font layout shift ([#1010](https://github.com/videojs/v10/pull/1010)) by [@decepulis](https://github.com/decepulis)
- *(site)* Remove top-level await from ClientCode to fix Safari hydration ([#1006](https://github.com/videojs/v10/pull/1006)) by [@decepulis](https://github.com/decepulis)
- *(skin)* Fixes for react poster image alignment ([#1003](https://github.com/videojs/v10/pull/1003)) by [@sampotts](https://github.com/sampotts)
- *(html)* Restore deprecated slot="media" for backwards compatibility ([#1020](https://github.com/videojs/v10/pull/1020)) by [@mihar-22](https://github.com/mihar-22)
- *(skin)* Hide volume popover when volume control is unsupported ([#1025](https://github.com/videojs/v10/pull/1025)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Round thumbnail dimensions to prevent sub-pixel gaps ([#995](https://github.com/videojs/v10/pull/995)) by [@sampotts](https://github.com/sampotts)
- *(html)* Extended media not working over cdn ([#1019](https://github.com/videojs/v10/pull/1019)) by [@mihar-22](https://github.com/mihar-22)

### 🚜 Refactor
- *(packages)* Move store attach lifecycle to provider ([#975](https://github.com/videojs/v10/pull/975)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Context-based media discovery, remove slot="media" ([#997](https://github.com/videojs/v10/pull/997)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Collapse unchanged packages in bundle size report ([#1016](https://github.com/videojs/v10/pull/1016)) by [@mihar-22](https://github.com/mihar-22)

### 📚 Documentation
- *(site)* Clean up concept pages from #769 ([#970](https://github.com/videojs/v10/pull/970)) by [@decepulis](https://github.com/decepulis)
- *(internal)* Add gesture as components decision ([#949](https://github.com/videojs/v10/pull/949)) by [@esbie](https://github.com/esbie)
- *(site)* Add Slider and Tooltip API reference pages ([#862](https://github.com/videojs/v10/pull/862)) by [@decepulis](https://github.com/decepulis)
- *(design)* Add SPF living design docs ([#899](https://github.com/videojs/v10/pull/899)) by [@cjpillsbury](https://github.com/cjpillsbury)
- Update site for context-based media discovery ([#1018](https://github.com/videojs/v10/pull/1018)) by [@mihar-22](https://github.com/mihar-22)

### ⚙️ Miscellaneous Tasks
- *(changelog)* Release please token ([#973](https://github.com/videojs/v10/pull/973)) by [@luwes](https://github.com/luwes)
- *(sandbox)* Update sandbox deps ([#983](https://github.com/videojs/v10/pull/983)) by [@sampotts](https://github.com/sampotts)
- *(cd)* Add changelog actions pipeline ([#1032](https://github.com/videojs/v10/pull/1032)) by [@decepulis](https://github.com/decepulis)

## [@videojs/core@10.0.0-beta.6] - 2026-03-15

### 🚀 Features
- *(site)* Add shiki notation transformers ([#937](https://github.com/videojs/v10/pull/937)) by [@decepulis](https://github.com/decepulis)
- Add slider preview thumbnails ([#935](https://github.com/videojs/v10/pull/935)) by [@sampotts](https://github.com/sampotts)

### 🐛 Bug Fixes
- *(site)* Improve whitespace around links ([#913](https://github.com/videojs/v10/pull/913)) by [@decepulis](https://github.com/decepulis)
- *(site)* Fix Brightcove typo ([#915](https://github.com/videojs/v10/pull/915)) by [@decepulis](https://github.com/decepulis)
- *(changelog)* Add root changelog generator ([#916](https://github.com/videojs/v10/pull/916)) by [@luwes](https://github.com/luwes)
- *(site)* Restore blank lines in code blocks ([#945](https://github.com/videojs/v10/pull/945)) by [@decepulis](https://github.com/decepulis)
- *(sandbox)* Use getMuxPosterSrc ([#950](https://github.com/videojs/v10/pull/950)) by [@sampotts](https://github.com/sampotts)
- Add popover and tooltip safe areas ([#951](https://github.com/videojs/v10/pull/951)) by [@sampotts](https://github.com/sampotts)
- *(html)* Simplify styles for slotted video ([#953](https://github.com/videojs/v10/pull/953)) by [@sampotts](https://github.com/sampotts)

### 📚 Documentation
- *(site)* Add skins & architecture concept pages ([#769](https://github.com/videojs/v10/pull/769)) by [@heff](https://github.com/heff)

### ⚙️ Miscellaneous Tasks
- *(changelog)* Remove keepachangelog header ([#918](https://github.com/videojs/v10/pull/918)) by [@luwes](https://github.com/luwes)
- Ignore .claude/worktrees/ directory ([#932](https://github.com/videojs/v10/pull/932)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Add Algolia site verification meta tag ([#939](https://github.com/videojs/v10/pull/939)) by [@decepulis](https://github.com/decepulis)

### New Contributors
* @esbie made their first contribution in [#917](https://github.com/videojs/v10/pull/917)

## [@videojs/core@10.0.0-beta.5] - 2026-03-12

### 🐛 Bug Fixes
- *(skin)* Only set poster object-fit: contain in fullscreen ([#906](https://github.com/videojs/v10/pull/906)) by [@sampotts](https://github.com/sampotts)
- *(site)* Include HLS CDN script in installation builder ([#907](https://github.com/videojs/v10/pull/907)) by [@mihar-22](https://github.com/mihar-22)
- *(skin)* Scope controls transitions to fine pointer only ([#909](https://github.com/videojs/v10/pull/909)) by [@mihar-22](https://github.com/mihar-22)
- *(cd)* Add @videojs/skins to release please ([#910](https://github.com/videojs/v10/pull/910)) by [@sampotts](https://github.com/sampotts)

## [@videojs/core@10.0.0-beta.4] - 2026-03-12

### 🚀 Features
- *(spf)* Stream segment fetches via ReadableStream body ([#890](https://github.com/videojs/v10/pull/890)) by [@cjpillsbury](https://github.com/cjpillsbury)

### 🐛 Bug Fixes
- *(site)* Work around video layout quirks in hero ([#884](https://github.com/videojs/v10/pull/884)) by [@decepulis](https://github.com/decepulis)
- *(site)* Redirect trailing-slash URLs via edge function ([#885](https://github.com/videojs/v10/pull/885)) by [@decepulis](https://github.com/decepulis)
- *(site)* Filter devOnly posts from RSS feed ([#888](https://github.com/videojs/v10/pull/888)) by [@decepulis](https://github.com/decepulis)
- Attaching media like elements and upgrade ([#889](https://github.com/videojs/v10/pull/889)) by [@luwes](https://github.com/luwes)
- *(skin)* Standardize backdrop-filter and fix minimal root sizing ([#895](https://github.com/videojs/v10/pull/895)) by [@sampotts](https://github.com/sampotts)
- *(site)* Replace GA4 with PostHog cookieless analytics ([#894](https://github.com/videojs/v10/pull/894)) by [@decepulis](https://github.com/decepulis)
- Mobile controls issues ([#896](https://github.com/videojs/v10/pull/896)) by [@luwes](https://github.com/luwes)
- *(skin)* Add missing tooltip provider/group ([#902](https://github.com/videojs/v10/pull/902)) by [@sampotts](https://github.com/sampotts)
- *(site)* Add playsinline to home and installation snippets ([#897](https://github.com/videojs/v10/pull/897)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Skip delay when switching between grouped tooltips ([#903](https://github.com/videojs/v10/pull/903)) by [@sampotts](https://github.com/sampotts)
- *(spf)* Propagate byteRange when building segment load tasks ([#904](https://github.com/videojs/v10/pull/904)) by [@cjpillsbury](https://github.com/cjpillsbury)
- *(skin)* Fix fullscreen video clipping and border-radius handling ([#905](https://github.com/videojs/v10/pull/905)) by [@sampotts](https://github.com/sampotts)

### ⚙️ Miscellaneous Tasks
- *(changelog)* Use one root level changelog ([#900](https://github.com/videojs/v10/pull/900)) by [@luwes](https://github.com/luwes)
- *(changelog)* Fix changelog-path ([#901](https://github.com/videojs/v10/pull/901)) by [@luwes](https://github.com/luwes)

## [@videojs/core@10.0.0-beta.3] - 2026-03-11

### 🚀 Features
- *(site)* Add optional OG image support to blog posts ([#878](https://github.com/videojs/v10/pull/878)) by [@decepulis](https://github.com/decepulis)

### 🐛 Bug Fixes
- *(html)* Remove commented error dialog blocks from video skins ([#865](https://github.com/videojs/v10/pull/865)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Add missing slot="media" to HTML demo video elements ([#867](https://github.com/videojs/v10/pull/867)) by [@decepulis](https://github.com/decepulis)
- *(site)* Netlify aliases -> redirects ([#868](https://github.com/videojs/v10/pull/868)) by [@decepulis](https://github.com/decepulis)
- *(site)* Use custom domain for og:image on production deploys ([#880](https://github.com/videojs/v10/pull/880)) by [@decepulis](https://github.com/decepulis)
- *(html)* Fix html container sizing ([#881](https://github.com/videojs/v10/pull/881)) by [@sampotts](https://github.com/sampotts)
- *(core)* Resolve pip state against media target ([#883](https://github.com/videojs/v10/pull/883)) by [@mihar-22](https://github.com/mihar-22)
- *(skins)* Remove legacy caption markup artifacts ([#882](https://github.com/videojs/v10/pull/882)) by [@mihar-22](https://github.com/mihar-22)

### ⚙️ Miscellaneous Tasks
- *(site)* Remove v8 link checker integration ([#879](https://github.com/videojs/v10/pull/879)) by [@decepulis](https://github.com/decepulis)
- *(sandbox)* Sandbox cleanup ([#797](https://github.com/videojs/v10/pull/797)) by [@sampotts](https://github.com/sampotts)

## [@videojs/core@10.0.0-beta.2] - 2026-03-10

### 🚀 Features
- *(site)* Use HlsVideo in homepage HeroVideo component ([#854](https://github.com/videojs/v10/pull/854)) by [@decepulis](https://github.com/decepulis)
- *(html)* Add CDN bundles and inline template minification ([#827](https://github.com/videojs/v10/pull/827)) by [@mihar-22](https://github.com/mihar-22)

### 🐛 Bug Fixes
- *(docs)* Update v10 blog post ([#852](https://github.com/videojs/v10/pull/852)) by [@decepulis](https://github.com/decepulis)
- *(site)* Move legacy banner to base layout and fix mobile text size ([#855](https://github.com/videojs/v10/pull/855)) by [@decepulis](https://github.com/decepulis)
- *(site)* Fix legacy banner layout on narrow viewports ([#856](https://github.com/videojs/v10/pull/856)) by [@decepulis](https://github.com/decepulis)
- *(site)* Center-align radio option labels in ImageRadioGroup ([#858](https://github.com/videojs/v10/pull/858)) by [@decepulis](https://github.com/decepulis)

### 📚 Documentation
- Discord link in blog post ([#863](https://github.com/videojs/v10/pull/863)) by [@heff](https://github.com/heff)

### ⚙️ Miscellaneous Tasks
- *(site)* Migrate to videojs.org and clean up remaining redirects ([#853](https://github.com/videojs/v10/pull/853)) by [@decepulis](https://github.com/decepulis)

## [@videojs/core@10.0.0-beta.1] - 2026-03-10

### 🚀 Features
- *(site)* Ejected skins build script, docs page, and home page wiring ([#809](https://github.com/videojs/v10/pull/809)) by [@sampotts](https://github.com/sampotts)

### 🐛 Bug Fixes
- *(docs)* Update README contributing section for beta ([#847](https://github.com/videojs/v10/pull/847)) by [@decepulis](https://github.com/decepulis)
- *(packages)* Update package READMEs for beta ([#848](https://github.com/videojs/v10/pull/848)) by [@decepulis](https://github.com/decepulis)
- *(packages)* Set release-please manifest and package versions to beta.0 ([#850](https://github.com/videojs/v10/pull/850)) by [@decepulis](https://github.com/decepulis)

### ⚙️ Miscellaneous Tasks
- *(cd)* Transition from alpha/next to beta/latest ([#846](https://github.com/videojs/v10/pull/846)) by [@decepulis](https://github.com/decepulis)

## [@videojs/core@10.0.0-alpha.11] - 2026-03-10

### 🚀 Features
- *(spf)* Basic ManagedMediaSource support for Safari ([#843](https://github.com/videojs/v10/pull/843)) by [@cjpillsbury](https://github.com/cjpillsbury)

### 🐛 Bug Fixes
- *(site)* Correct homepage download comparison ([#823](https://github.com/videojs/v10/pull/823)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Use MUX_URL const with UTM params for mux.com links ([#833](https://github.com/videojs/v10/pull/833)) by [@decepulis](https://github.com/decepulis)
- *(spf)* Prefer MediaSource over ManagedMediaSource ([#838](https://github.com/videojs/v10/pull/838)) by [@cjpillsbury](https://github.com/cjpillsbury)
- *(spf)* Fix async teardown leaks and recreate engine on src change ([#841](https://github.com/videojs/v10/pull/841)) by [@cjpillsbury](https://github.com/cjpillsbury)
- *(spf)* Add missing repository field ([#844](https://github.com/videojs/v10/pull/844)) by [@decepulis](https://github.com/decepulis)

### 💼 Other
- Add default Mux sources to home and installation snippets ([#815](https://github.com/videojs/v10/pull/815)) by [@mihar-22](https://github.com/mihar-22)
- Force release please, please ([#829](https://github.com/videojs/v10/pull/829)) by [@cjpillsbury](https://github.com/cjpillsbury)

### 📚 Documentation
- Remove spread from videoFeatures examples ([#816](https://github.com/videojs/v10/pull/816)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Remove TODO placeholders from installation copy ([#820](https://github.com/videojs/v10/pull/820)) by [@mihar-22](https://github.com/mihar-22)
- Move videojs CSS imports to top in React snippets ([#818](https://github.com/videojs/v10/pull/818)) by [@mihar-22](https://github.com/mihar-22)
- Add mux.com links in install/docs ([#819](https://github.com/videojs/v10/pull/819)) by [@mihar-22](https://github.com/mihar-22)
- Fix install tab label casing ([#822](https://github.com/videojs/v10/pull/822)) by [@mihar-22](https://github.com/mihar-22)
- Use framework exports in player API examples ([#821](https://github.com/videojs/v10/pull/821)) by [@mihar-22](https://github.com/mihar-22)
- Add 'use client' to React install example ([#825](https://github.com/videojs/v10/pull/825)) by [@mihar-22](https://github.com/mihar-22)
- Show HTML attribute name in API prop details ([#817](https://github.com/videojs/v10/pull/817)) by [@mihar-22](https://github.com/mihar-22)
- Use Audio/Video labels on installation page ([#824](https://github.com/videojs/v10/pull/824)) by [@mihar-22](https://github.com/mihar-22)
- V10 beta blog post ([#811](https://github.com/videojs/v10/pull/811)) by [@heff](https://github.com/heff)

## [@videojs/core@10.0.0-alpha.10] - 2026-03-10

### 🚀 Features
- *(site)* New home page, docs, and design system ([#566](https://github.com/videojs/v10/pull/566)) by [@ronalduQualabs](https://github.com/ronalduQualabs)
- *(skin)* Add audio skins for HTML and React presets ([#772](https://github.com/videojs/v10/pull/772)) by [@sampotts](https://github.com/sampotts)
- *(sandbox)* Rebuild sandbox with shell UI and expanded templates ([#773](https://github.com/videojs/v10/pull/773)) by [@sampotts](https://github.com/sampotts)
- *(site)* Darker dark mode footer ([#780](https://github.com/videojs/v10/pull/780)) by [@decepulis](https://github.com/decepulis)
- *(sandbox)* Dark mode support and template entry files ([#781](https://github.com/videojs/v10/pull/781)) by [@sampotts](https://github.com/sampotts)
- *(site)* Add cookieless Google Analytics ([#788](https://github.com/videojs/v10/pull/788)) by [@decepulis](https://github.com/decepulis)
- *(site)* Add legacy docs banner and v8 links ([#786](https://github.com/videojs/v10/pull/786)) by [@decepulis](https://github.com/decepulis)
- *(spf)* Initial push of SPF ([#784](https://github.com/videojs/v10/pull/784)) by [@cjpillsbury](https://github.com/cjpillsbury)
- *(skin)* Port tooltip styling from tech preview ([#800](https://github.com/videojs/v10/pull/800)) by [@sampotts](https://github.com/sampotts)

### 🐛 Bug Fixes
- *(ci)* Stabilize bundle size diff reporting for UI components ([#761](https://github.com/videojs/v10/pull/761)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Apply popover data attributes before showing via popover API ([#763](https://github.com/videojs/v10/pull/763)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Update mux sponsor language and alignment ([#768](https://github.com/videojs/v10/pull/768)) by [@decepulis](https://github.com/decepulis)
- *(site)* Redirect /guides to legacy.videojs.org ([#694](https://github.com/videojs/v10/pull/694)) by [@decepulis](https://github.com/decepulis)
- *(site)* Rebrand polish ([#775](https://github.com/videojs/v10/pull/775)) by [@decepulis](https://github.com/decepulis)
- *(core)* Prevent slider track click from closing popover ([#776](https://github.com/videojs/v10/pull/776)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Thumb edge alignment jump ([#766](https://github.com/videojs/v10/pull/766)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Handle remote image URLs in Img component ([#789](https://github.com/videojs/v10/pull/789)) by [@decepulis](https://github.com/decepulis)
- *(sandbox)* Use simpler web storage hook ([#794](https://github.com/videojs/v10/pull/794)) by [@sampotts](https://github.com/sampotts)
- *(site)* Use Consent Mode v2 for cookieless Google Analytics ([#795](https://github.com/videojs/v10/pull/795)) by [@decepulis](https://github.com/decepulis)
- *(core)* Optimistic current time update on seek to prevent slider snap-back ([#799](https://github.com/videojs/v10/pull/799)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Allow exact tumblr image URL ([#803](https://github.com/videojs/v10/pull/803)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Use composedPath for popover outside-click detection ([#806](https://github.com/videojs/v10/pull/806)) by [@mihar-22](https://github.com/mihar-22)
- *(slider)* Keep pointer position after pointerleave ([#807](https://github.com/videojs/v10/pull/807)) by [@mihar-22](https://github.com/mihar-22)

### 💼 Other
- *(spf)* Add spf to release please config ([#796](https://github.com/videojs/v10/pull/796)) by [@cjpillsbury](https://github.com/cjpillsbury)

### 🚜 Refactor
- *(core)* Replace document listeners with pointer capture in slider ([#762](https://github.com/videojs/v10/pull/762)) by [@mihar-22](https://github.com/mihar-22)

### 📚 Documentation
- Add captions button ([#777](https://github.com/videojs/v10/pull/777)) by [@luwes](https://github.com/luwes)
- *(site)* React API reference styling sections use correct selectors ([#785](https://github.com/videojs/v10/pull/785)) by [@decepulis](https://github.com/decepulis)

### ⚙️ Miscellaneous Tasks
- Update examples to have sidebar and more examples link on non ([#767](https://github.com/videojs/v10/pull/767)) by [@luwes](https://github.com/luwes)
- *(packages)* Remove tech-preview package ([#793](https://github.com/videojs/v10/pull/793)) by [@mihar-22](https://github.com/mihar-22)
- *(sandbox)* Add hls-video to new sandbox setup (NOTE: hls-video H… ([#798](https://github.com/videojs/v10/pull/798)) by [@cjpillsbury](https://github.com/cjpillsbury)
- Gitignore `.claude/settings.local.json` ([#770](https://github.com/videojs/v10/pull/770)) by [@heff](https://github.com/heff)
- *(sandbox)* Adding spf/simple-hls-video + filtering to only include CMAF/fmp4 sources ([#802](https://github.com/videojs/v10/pull/802)) by [@cjpillsbury](https://github.com/cjpillsbury)
- *(skin)* Refactor tooltip/popover styles/classnames ([#801](https://github.com/videojs/v10/pull/801)) by [@sampotts](https://github.com/sampotts)
- Fix repo biome lint errors ([#804](https://github.com/videojs/v10/pull/804)) by [@mihar-22](https://github.com/mihar-22)

### New Contributors
* @ronalduQualabs made their first contribution in [#566](https://github.com/videojs/v10/pull/566)

## [@videojs/core@10.0.0-alpha.9] - 2026-03-06

### 🚀 Features
- Add subtitles handling + captions core ([#692](https://github.com/videojs/v10/pull/692)) by [@luwes](https://github.com/luwes)
- *(react)* Add alert dialog component ([#739](https://github.com/videojs/v10/pull/739)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Add alert dialog element ([#741](https://github.com/videojs/v10/pull/741)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Add alert dialog to video skin ([#747](https://github.com/videojs/v10/pull/747)) by [@mihar-22](https://github.com/mihar-22)

### 🐛 Bug Fixes
- Destroy hls.js instance on media unmount ([#749](https://github.com/videojs/v10/pull/749)) by [@luwes](https://github.com/luwes)
- *(ci)* Rework bundle size report ([#745](https://github.com/videojs/v10/pull/745)) by [@mihar-22](https://github.com/mihar-22)
- Delegate not defining Delegate props ([#751](https://github.com/videojs/v10/pull/751)) by [@luwes](https://github.com/luwes)
- *(core)* Auto-unmute on volume change and restore volume on unmute ([#752](https://github.com/videojs/v10/pull/752)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Add destroy ([#748](https://github.com/videojs/v10/pull/748)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Derive effective mute state for volume UI components ([#753](https://github.com/videojs/v10/pull/753)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Use double-RAF in transition open to enable entry animations ([#755](https://github.com/videojs/v10/pull/755)) by [@mihar-22](https://github.com/mihar-22)
- Ssr issue with hls.js ([#758](https://github.com/videojs/v10/pull/758)) by [@luwes](https://github.com/luwes)
- TextTrackList and optimize ([#760](https://github.com/videojs/v10/pull/760)) by [@luwes](https://github.com/luwes)

### ◀️ Revert
- *(html)* Remove double raf hls destroy ([#754](https://github.com/videojs/v10/pull/754)) by [@mihar-22](https://github.com/mihar-22)

## [@videojs/core@10.0.0-alpha.8] - 2026-03-05

### 🚀 Features
- Small state and naming fixes  ([#719](https://github.com/videojs/v10/pull/719)) by [@luwes](https://github.com/luwes)
- *(html)* Add slider thumbnail element ([#714](https://github.com/videojs/v10/pull/714)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Add slider thumbnail component ([#722](https://github.com/videojs/v10/pull/722)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Add slider preview component ([#710](https://github.com/videojs/v10/pull/710)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Add slider preview element ([#733](https://github.com/videojs/v10/pull/733)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add tooltip  ([#734](https://github.com/videojs/v10/pull/734)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Add tooltip element ([#735](https://github.com/videojs/v10/pull/735)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Add tooltip component ([#736](https://github.com/videojs/v10/pull/736)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add error feature ([#713](https://github.com/videojs/v10/pull/713)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add AlertDialog data attributes ([#738](https://github.com/videojs/v10/pull/738)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add alert dialog with dismiss layer and transitions ([#743](https://github.com/videojs/v10/pull/743)) by [@mihar-22](https://github.com/mihar-22)

### 🐛 Bug Fixes
- *(react)* Set anchor-name and position-anchor imperatively in popover ([#715](https://github.com/videojs/v10/pull/715)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Slider interaction and edge alignment broken ([#721](https://github.com/videojs/v10/pull/721)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Add missing slot="media" to renderer element in HTML code block ([#737](https://github.com/videojs/v10/pull/737)) by [@decepulis](https://github.com/decepulis)
- *(ci)* Reuse diagnosis comment per PR instead of per run ([#740](https://github.com/videojs/v10/pull/740)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Strict mode support ([#742](https://github.com/videojs/v10/pull/742)) by [@mihar-22](https://github.com/mihar-22)

### 📚 Documentation
- Add type module to cdn imports by [@decepulis](https://github.com/decepulis)

## [@videojs/core@10.0.0-alpha.7] - 2026-03-04

### 🐛 Bug Fixes
- *(html,react)* Move @videojs/skins to devDependencies ([#716](https://github.com/videojs/v10/pull/716)) by [@decepulis](https://github.com/decepulis)

## [@videojs/core@10.0.0-alpha.6] - 2026-03-04

### 🐛 Bug Fixes
- *(site)* Reset installation guide to implemented features ([#707](https://github.com/videojs/v10/pull/707)) by [@decepulis](https://github.com/decepulis)
- *(core)* Use camelCase attribute names in slider for react ([#708](https://github.com/videojs/v10/pull/708)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Prevent shell injection from PR title/body in sync workflow ([#711](https://github.com/videojs/v10/pull/711)) by [@decepulis](https://github.com/decepulis)
- *(html)* Move @videojs/icons to devDependencies ([#712](https://github.com/videojs/v10/pull/712)) by [@decepulis](https://github.com/decepulis)

## [@videojs/core@10.0.0-alpha.5] - 2026-03-04

### 🚀 Features
- *(react)* Support native caption track shifting in video skins ([#636](https://github.com/videojs/v10/pull/636)) by [@sampotts](https://github.com/sampotts)
- *(react)* Add playback rate button component ([#639](https://github.com/videojs/v10/pull/639)) by [@sampotts](https://github.com/sampotts)
- *(packages)* Add PlaybackRateButton to core, html, and react ([#642](https://github.com/videojs/v10/pull/642)) by [@decepulis](https://github.com/decepulis)
- *(core)* Add thumbnail component and text track store feature ([#643](https://github.com/videojs/v10/pull/643)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Add thumbnail element ([#646](https://github.com/videojs/v10/pull/646)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Add thumbnail component ([#648](https://github.com/videojs/v10/pull/648)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add popover component ([#615](https://github.com/videojs/v10/pull/615)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Add popover element ([#652](https://github.com/videojs/v10/pull/652)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Add popover component ([#653](https://github.com/videojs/v10/pull/653)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Add slider component ([#644](https://github.com/videojs/v10/pull/644)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Add time slider component ([#647](https://github.com/videojs/v10/pull/647)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Add slider element ([#655](https://github.com/videojs/v10/pull/655)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Add time slider element ([#656](https://github.com/videojs/v10/pull/656)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Add volume slider element ([#657](https://github.com/videojs/v10/pull/657)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Port time slider styling into video skin presets ([#666](https://github.com/videojs/v10/pull/666)) by [@sampotts](https://github.com/sampotts)
- *(react)* Port volume popover and slider styling into skin presets ([#667](https://github.com/videojs/v10/pull/667)) by [@sampotts](https://github.com/sampotts)
- *(react)* Orientation-aware buffer styling and slider improvements ([#671](https://github.com/videojs/v10/pull/671)) by [@sampotts](https://github.com/sampotts)
- *(sandbox)* Add README and sync script ([#673](https://github.com/videojs/v10/pull/673)) by [@sampotts](https://github.com/sampotts)
- *(ci)* Add weekly project report workflow ([#665](https://github.com/videojs/v10/pull/665)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Add issue-to-pr claude workflow ([#675](https://github.com/videojs/v10/pull/675)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Add api-reference sync agent workflow ([#676](https://github.com/videojs/v10/pull/676)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Split llms.txt into per-framework and blog sub-indexes ([#697](https://github.com/videojs/v10/pull/697)) by [@decepulis](https://github.com/decepulis)
- *(site)* Add TimeSlider, VolumeSlider, Popover API references ([#685](https://github.com/videojs/v10/pull/685)) by [@decepulis](https://github.com/decepulis)
- *(skin)* Implement default and minimal skins for HTML player ([#698](https://github.com/videojs/v10/pull/698)) by [@sampotts](https://github.com/sampotts)
- *(site)* Replace home page tech preview player with real player ([#580](https://github.com/videojs/v10/pull/580)) by [@decepulis](https://github.com/decepulis)

### 🐛 Bug Fixes
- *(skin)* Temporarily hide the caption button ([#629](https://github.com/videojs/v10/pull/629)) by [@sampotts](https://github.com/sampotts)
- Revert preset provider ([#631](https://github.com/videojs/v10/pull/631)) by [@luwes](https://github.com/luwes)
- Add SSR stubs for HLS media ([#641](https://github.com/videojs/v10/pull/641)) by [@luwes](https://github.com/luwes)
- *(ci)* Allow OIDC token in issue sync workflow ([#661](https://github.com/videojs/v10/pull/661)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Reduce issue sync permission denials ([#662](https://github.com/videojs/v10/pull/662)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Use relative import path for useForceRender ([#669](https://github.com/videojs/v10/pull/669)) by [@sampotts](https://github.com/sampotts)
- *(react)* Correct buffer selector names in minimal skin CSS ([#672](https://github.com/videojs/v10/pull/672)) by [@sampotts](https://github.com/sampotts)
- *(site)* Strip script and style tags from llms markdown output ([#678](https://github.com/videojs/v10/pull/678)) by [@decepulis](https://github.com/decepulis)
- *(site)* Review cleanup for API reference pages ([#685](https://github.com/videojs/v10/pull/685)) by [@decepulis](https://github.com/decepulis)
- *(html)* Prevent tsdown from stripping custom element registrations ([#703](https://github.com/videojs/v10/pull/703)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Skip error pages and strip styles in llms-markdown integration ([#706](https://github.com/videojs/v10/pull/706)) by [@decepulis](https://github.com/decepulis)

### 🚜 Refactor
- *(html)* Separate provider and container concerns in createPlayer ([#635](https://github.com/videojs/v10/pull/635)) by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Move feature presets to subpath exports ([#633](https://github.com/videojs/v10/pull/633)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Split UI define modules and narrow slider imports ([#659](https://github.com/videojs/v10/pull/659)) by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Dry up core, html, and react UI architecture ([#699](https://github.com/videojs/v10/pull/699)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Split api-reference sync into three focused jobs ([#677](https://github.com/videojs/v10/pull/677)) by [@decepulis](https://github.com/decepulis)

### 📚 Documentation
- *(design)* PlaybackRateButton component spec ([#624](https://github.com/videojs/v10/pull/624)) by [@decepulis](https://github.com/decepulis)
- *(site)* Use createPlayer in React installation code generator ([#634](https://github.com/videojs/v10/pull/634)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Add thumbnail reference page  ([#654](https://github.com/videojs/v10/pull/654)) by [@mihar-22](https://github.com/mihar-22)
- *(root)* Update timeline dates for alpha and beta by [@mihar-22](https://github.com/mihar-22)

### ⚙️ Miscellaneous Tasks
- *(ci)* Add issue sync workflow ([#660](https://github.com/videojs/v10/pull/660)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Migrate issue triage workflow to Claude agent ([#663](https://github.com/videojs/v10/pull/663)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Add explicit checks and Claude diagnosis ([#664](https://github.com/videojs/v10/pull/664)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Remove weekly project report workflow ([#680](https://github.com/videojs/v10/pull/680)) by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Add session start hook to run gh-setup-hooks ([#700](https://github.com/videojs/v10/pull/700)) by [@mihar-22](https://github.com/mihar-22)

## [@videojs/core@10.0.0-alpha.4] - 2026-02-26

### 🚀 Features
- Add background video preset ([#607](https://github.com/videojs/v10/pull/607)) by [@luwes](https://github.com/luwes)

### 🐛 Bug Fixes
- *(react)* Move @videojs/icons to devDependencies by [@decepulis](https://github.com/decepulis)
- *(react)* Update lockfile for icons dependency move by [@decepulis](https://github.com/decepulis)

## [@videojs/core@10.0.0-alpha.3] - 2026-02-26

### 🐛 Bug Fixes
- *(cd)* Add repository field to all packages for provenance verification by [@decepulis](https://github.com/decepulis)

## [@videojs/core@10.0.0-alpha.2] - 2026-02-26

### 🚀 Features
- *(cd)* Switch to npm trusted publishers by [@decepulis](https://github.com/decepulis)

## [@videojs/core@10.0.0-alpha.1] - 2026-02-26

### 🚀 Features
- *(example/react)* Improvements to react examples ([#210](https://github.com/videojs/v10/pull/210)) by [@sampotts](https://github.com/sampotts)
- *(core)* Add user activity logic ([#278](https://github.com/videojs/v10/pull/278)) by [@sampotts](https://github.com/sampotts)
- *(store)* Initial release ([#279](https://github.com/videojs/v10/pull/279)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Add error codes ([#284](https://github.com/videojs/v10/pull/284)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Queue task refactor ([#287](https://github.com/videojs/v10/pull/287)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* React bindings ([#288](https://github.com/videojs/v10/pull/288)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Dom media slices ([#292](https://github.com/videojs/v10/pull/292)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Lit bindings ([#289](https://github.com/videojs/v10/pull/289)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Add video component and utility hooks ([#293](https://github.com/videojs/v10/pull/293)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* UseMutation hook for react ([#290](https://github.com/videojs/v10/pull/290)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* UseOptimistic hook for react ([#291](https://github.com/videojs/v10/pull/291)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Lit bound controllers ([#297](https://github.com/videojs/v10/pull/297)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Skin store setup ([#298](https://github.com/videojs/v10/pull/298)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Sync queue ([#308](https://github.com/videojs/v10/pull/308)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Add reactive state primitives ([#311](https://github.com/videojs/v10/pull/311)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Align queue with native ([#312](https://github.com/videojs/v10/pull/312)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Store selector api ([#370](https://github.com/videojs/v10/pull/370)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add player target and feature selectors ([#371](https://github.com/videojs/v10/pull/371)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Setup react player api ([#372](https://github.com/videojs/v10/pull/372)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Setup player api ([#374](https://github.com/videojs/v10/pull/374)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Add `PlayerElement` to `createPlayer` ([#376](https://github.com/videojs/v10/pull/376)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Remove style from urls ([#378](https://github.com/videojs/v10/pull/378)) by [@decepulis](https://github.com/decepulis)
- *(site)* Add interactive getting started guide ([#280](https://github.com/videojs/v10/pull/280)) by [@daniel-hayes](https://github.com/daniel-hayes)
- *(core)* Add play button component ([#383](https://github.com/videojs/v10/pull/383)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add mute button component ([#455](https://github.com/videojs/v10/pull/455)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Extract api reference from components ([#464](https://github.com/videojs/v10/pull/464)) by [@decepulis](https://github.com/decepulis)
- *(core)* Add presentation feature ([#458](https://github.com/videojs/v10/pull/458)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add time display component ([#460](https://github.com/videojs/v10/pull/460)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add fullscreen button component ([#459](https://github.com/videojs/v10/pull/459)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Generated multipart component api reference ([#468](https://github.com/videojs/v10/pull/468)) by [@decepulis](https://github.com/decepulis)
- *(sandbox)* Add private sandbox package for internal testing ([#478](https://github.com/videojs/v10/pull/478)) by [@mihar-22](https://github.com/mihar-22)
- *(html)* Reorganize import paths by use case ([#480](https://github.com/videojs/v10/pull/480)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Perform /docs redirect client-side by [@decepulis](https://github.com/decepulis)
- *(site)* Simple api reference examples ([#472](https://github.com/videojs/v10/pull/472)) by [@decepulis](https://github.com/decepulis)
- *(site)* Add display font by [@decepulis](https://github.com/decepulis)
- *(core)* Add poster component ([#457](https://github.com/videojs/v10/pull/457)) by [@mihar-22](https://github.com/mihar-22)
- *(element)* Add lightweight reactive element base ([#513](https://github.com/videojs/v10/pull/513)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add controls component with activity tracking ([#514](https://github.com/videojs/v10/pull/514)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Basic 404 and 500 pages by [@decepulis](https://github.com/decepulis)
- *(site)* Controls API reference by [@decepulis](https://github.com/decepulis)
- *(site)* Poster API reference by [@decepulis](https://github.com/decepulis)
- *(site)* Clean up api reference header hierarchy by [@decepulis](https://github.com/decepulis)
- *(core)* Add pip button component ([#525](https://github.com/videojs/v10/pull/525)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add seek button component ([#526](https://github.com/videojs/v10/pull/526)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Add buffering indicator component ([#527](https://github.com/videojs/v10/pull/527)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* State subscription primitives ([#528](https://github.com/videojs/v10/pull/528)) by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Add slider core layer ([#529](https://github.com/videojs/v10/pull/529)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Add pip button api reference by [@decepulis](https://github.com/decepulis)
- *(site)* Add seek button api reference by [@decepulis](https://github.com/decepulis)
- *(site)* Add buffering indicator api reference by [@decepulis](https://github.com/decepulis)
- *(react)* Initial skin scaffolding ([#523](https://github.com/videojs/v10/pull/523)) by [@sampotts](https://github.com/sampotts)
- *(icons)* Setup icons package ([#536](https://github.com/videojs/v10/pull/536)) by [@sampotts](https://github.com/sampotts)
- *(site)* Add Mux health check action ([#542](https://github.com/videojs/v10/pull/542)) by [@decepulis](https://github.com/decepulis)
- *(site)* Framework-specific SEO metadata for docs ([#541](https://github.com/videojs/v10/pull/541)) by [@decepulis](https://github.com/decepulis)
- Add media API + HLS video components ([#507](https://github.com/videojs/v10/pull/507)) by [@luwes](https://github.com/luwes)
- *(react)* Implement default and minimal video skins ([#550](https://github.com/videojs/v10/pull/550)) by [@sampotts](https://github.com/sampotts)
- *(react)* Implement video skins with responsive layout ([#568](https://github.com/videojs/v10/pull/568)) by [@sampotts](https://github.com/sampotts)
- *(site)* Add markdown content negotiation via Netlify edge function ([#573](https://github.com/videojs/v10/pull/573)) by [@decepulis](https://github.com/decepulis)
- *(react)* Add captions styling to video skins ([#582](https://github.com/videojs/v10/pull/582)) by [@sampotts](https://github.com/sampotts)
- Add background video components ([#567](https://github.com/videojs/v10/pull/567)) by [@luwes](https://github.com/luwes)
- *(react)* Add Tailwind ejected video skins ([#589](https://github.com/videojs/v10/pull/589)) by [@sampotts](https://github.com/sampotts)
- Add media delegate mixin ([#598](https://github.com/videojs/v10/pull/598)) by [@luwes](https://github.com/luwes)
- *(site)* Add util reference pipeline ([#537](https://github.com/videojs/v10/pull/537)) by [@decepulis](https://github.com/decepulis)
- *(skin)* Add error dialogs ([#603](https://github.com/videojs/v10/pull/603)) by [@sampotts](https://github.com/sampotts)
- *(site)* Preserve scroll position on framework switch (pagereveal) ([#608](https://github.com/videojs/v10/pull/608)) by [@decepulis](https://github.com/decepulis)
- *(skin)* Add captions button to video skins ([#612](https://github.com/videojs/v10/pull/612)) by [@sampotts](https://github.com/sampotts)
- *(core)* Add slider dom ([#613](https://github.com/videojs/v10/pull/613)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Source URL auto-detection for installation page ([#619](https://github.com/videojs/v10/pull/619)) by [@decepulis](https://github.com/decepulis)

### 🐛 Bug Fixes
- *(core)* Fixed fullscreen on ios safari ([#211](https://github.com/videojs/v10/pull/211)) by [@LachlanRumery](https://github.com/LachlanRumery)
- *(example/react)* Fix routing on vercel ([#217](https://github.com/videojs/v10/pull/217)) by [@sampotts](https://github.com/sampotts)
- *(examples)* Fix CSS consistency issues ([#309](https://github.com/videojs/v10/pull/309)) by [@sampotts](https://github.com/sampotts)
- *(store)* Guard abort on request supersession ([#313](https://github.com/videojs/v10/pull/313)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Style overflowing tables by [@decepulis](https://github.com/decepulis)
- Update npm install paths ([#379](https://github.com/videojs/v10/pull/379)) by [@decepulis](https://github.com/decepulis)
- *(site)* Apply dark mode to code blocks by [@decepulis](https://github.com/decepulis)
- *(site)* Correct table overscroll indicator color in dark mode by [@decepulis](https://github.com/decepulis)
- *(docs)* Updating installation langauge by [@heff](https://github.com/heff)
- *(docs)* Add audio to getting started guide and other updates by [@heff](https://github.com/heff)
- *(ci)* Work around false-positive biome / astro errors by [@decepulis](https://github.com/decepulis)
- *(packages)* Enable unbundle mode to avoid mangled exports by [@mihar-22](https://github.com/mihar-22)
- *(html)* Discover media elements and attach store target via DOM ([#481](https://github.com/videojs/v10/pull/481)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Improve initial demo css by [@decepulis](https://github.com/decepulis)
- *(site)* Improve time demo css by [@decepulis](https://github.com/decepulis)
- *(site)* Don't hit archive.org during build by [@decepulis](https://github.com/decepulis)
- *(site)* Show docs sidebar on tablet by [@decepulis](https://github.com/decepulis)
- *(site)* Clarify "Copy as Markdown" button by [@decepulis](https://github.com/decepulis)
- *(site)* Support satisfies in api-docs data attrs extraction ([#517](https://github.com/videojs/v10/pull/517)) by [@decepulis](https://github.com/decepulis)
- *(site)* Resolve aliased part descriptions in api docs ([#518](https://github.com/videojs/v10/pull/518)) by [@decepulis](https://github.com/decepulis)
- *(site)* Use first-match-wins for multipart primary selection ([#519](https://github.com/videojs/v10/pull/519)) by [@decepulis](https://github.com/decepulis)
- *(site)* Strip trailing slashes from pathname when copying markdown by [@decepulis](https://github.com/decepulis)
- *(ci)* Fix website tests workflow ([#565](https://github.com/videojs/v10/pull/565)) by [@decepulis](https://github.com/decepulis)
- *(core)* Fix circular import and simplify media types ([#569](https://github.com/videojs/v10/pull/569)) by [@sampotts](https://github.com/sampotts)
- *(site)* Use astro:env for server-only environment variables ([#574](https://github.com/videojs/v10/pull/574)) by [@decepulis](https://github.com/decepulis)
- Use cross-platform Node script for postinstall symlinks ([#577](https://github.com/videojs/v10/pull/577)) by [@decepulis](https://github.com/decepulis)
- *(cd)* Use namespace imports for actions packages ([#583](https://github.com/videojs/v10/pull/583)) by [@sampotts](https://github.com/sampotts)
- *(site)* Improve auth popup size and clean up Mux links ([#587](https://github.com/videojs/v10/pull/587)) by [@decepulis](https://github.com/decepulis)
- *(site)* Upgrade to React 19 to resolve invalid hook call ([#597](https://github.com/videojs/v10/pull/597)) by [@decepulis](https://github.com/decepulis)
- *(site)* Work around Astro SSR false "Invalid hook call" warnings ([#600](https://github.com/videojs/v10/pull/600)) by [@decepulis](https://github.com/decepulis)
- *(sandbox)* Update style path in index.html ([#604](https://github.com/videojs/v10/pull/604)) by [@sampotts](https://github.com/sampotts)
- *(site)* Add missing background-video media element import ([#605](https://github.com/videojs/v10/pull/605)) by [@decepulis](https://github.com/decepulis)
- *(site)* Disable Netlify edge functions in dev to prevent Deno OOM ([#620](https://github.com/videojs/v10/pull/620)) by [@decepulis](https://github.com/decepulis)
- *(site)* Resolve biome lint warnings ([#602](https://github.com/videojs/v10/pull/602)) by [@decepulis](https://github.com/decepulis)
- *(core)* Preserve user props in time slider ([#621](https://github.com/videojs/v10/pull/621)) by [@mihar-22](https://github.com/mihar-22)

### 🚜 Refactor
- *(store)* Remove partial slice state updates ([#296](https://github.com/videojs/v10/pull/296)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Queue simplification ([#302](https://github.com/videojs/v10/pull/302)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Rename slice to feature ([#318](https://github.com/videojs/v10/pull/318)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Simplify state management + computeds ([#321](https://github.com/videojs/v10/pull/321)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Use undefined instead of null for void-input placeholder ([#322](https://github.com/videojs/v10/pull/322)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Flatten store/queue state ([#326](https://github.com/videojs/v10/pull/326)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Clean up by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Apply skill authoring guidelines to existing skills by [@mihar-22](https://github.com/mihar-22)
- *(store)* Simplify controller and state APIs ([#352](https://github.com/videojs/v10/pull/352)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Simplify queue - remove task state tracking ([#359](https://github.com/videojs/v10/pull/359)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Remove platform queue bindings ([#360](https://github.com/videojs/v10/pull/360)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Simplify create store implementations ([#361](https://github.com/videojs/v10/pull/361)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* V2 ([#362](https://github.com/videojs/v10/pull/362)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Merge getSnapshot/subscribe into attach ([#364](https://github.com/videojs/v10/pull/364)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Rename feature to slice ([#373](https://github.com/videojs/v10/pull/373)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Remove queue and task system ([#382](https://github.com/videojs/v10/pull/382)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Centralize feature state types ([#448](https://github.com/videojs/v10/pull/448)) by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Replace disposer with abort controller ([#449](https://github.com/videojs/v10/pull/449)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Replace signal/abort with signals namespace ([#453](https://github.com/videojs/v10/pull/453)) by [@mihar-22](https://github.com/mihar-22)
- *(core)* Prefix media state exports with `Media` ([#475](https://github.com/videojs/v10/pull/475)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Rename `Signals` to `AbortControllerRegistry` ([#476](https://github.com/videojs/v10/pull/476)) by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Simplify `createPlayer` type signatures ([#477](https://github.com/videojs/v10/pull/477)) by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Clean up UI component types and data flow ([#479](https://github.com/videojs/v10/pull/479)) by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Derive default props from core classes ([#488](https://github.com/videojs/v10/pull/488)) by [@mihar-22](https://github.com/mihar-22)
- Replace URL.pathname with fileURLToPath for cross-platform … ([#581](https://github.com/videojs/v10/pull/581)) by [@dh-mux](https://github.com/dh-mux)

### 📚 Documentation
- *(store)* Update readme by [@mihar-22](https://github.com/mihar-22)
- *(plan)* Store bindings ([#283](https://github.com/videojs/v10/pull/283)) by [@mihar-22](https://github.com/mihar-22)
- *(plan)* Remove old file by [@mihar-22](https://github.com/mihar-22)
- *(plan)* Update store bindings by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Add symbol identification pattern by [@mihar-22](https://github.com/mihar-22)
- *(plan)* Add using slices by [@mihar-22](https://github.com/mihar-22)
- *(root)* Add AI-assisted development section to CONTRIBUTING by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Add no co-author trailer rule by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Compact old store plans by [@mihar-22](https://github.com/mihar-22)
- *(plan)* Player api design ([#300](https://github.com/videojs/v10/pull/300)) by [@mihar-22](https://github.com/mihar-22)
- *(plan)* Clean up player api design examples by [@mihar-22](https://github.com/mihar-22)
- *(plan)* Add usage notes to player api design by [@mihar-22](https://github.com/mihar-22)
- *(rfc)* Add rfc structure ([#316](https://github.com/videojs/v10/pull/316)) by [@mihar-22](https://github.com/mihar-22)
- *(rfc)* Rename rfcs/ to rfc/ by [@mihar-22](https://github.com/mihar-22)
- *(rfc)* Primitives api & feature access ([#307](https://github.com/videojs/v10/pull/307)) by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Add `rfc` skill ([#319](https://github.com/videojs/v10/pull/319)) by [@mihar-22](https://github.com/mihar-22)
- *(plan)* Update store reactive plan by [@mihar-22](https://github.com/mihar-22)
- *(root)* Separate design from rfcs ([#351](https://github.com/videojs/v10/pull/351)) by [@mihar-22](https://github.com/mihar-22)
- *(design)* Add feature slice design ([#356](https://github.com/videojs/v10/pull/356)) by [@mihar-22](https://github.com/mihar-22)
- *(design)* Cross-reference feature-slice and feature-availability ([#357](https://github.com/videojs/v10/pull/357)) by [@mihar-22](https://github.com/mihar-22)
- *(rfc)* Player api design v2 ([#358](https://github.com/videojs/v10/pull/358)) by [@mihar-22](https://github.com/mihar-22)
- *(plan)* Store v2 by [@mihar-22](https://github.com/mihar-22)
- *(store)* Add feature API redesign plan by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Add player api plan by [@mihar-22](https://github.com/mihar-22)
- *(rfc)* Update player api to match implementation ([#375](https://github.com/videojs/v10/pull/375)) by [@mihar-22](https://github.com/mihar-22)
- *(rfc)* Use `createSelector` in player api examples by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Add Video.js component architecture patterns ([#450](https://github.com/videojs/v10/pull/450)) by [@mihar-22](https://github.com/mihar-22)
- *(store)* Align README with current API ([#451](https://github.com/videojs/v10/pull/451)) by [@mihar-22](https://github.com/mihar-22)
- *(design)* Add time component design ([#454](https://github.com/videojs/v10/pull/454)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Update getting started code examples to match new api ([#473](https://github.com/videojs/v10/pull/473)) by [@heff](https://github.com/heff)
- *(site)* Freshen up site README and CLAUDE by [@decepulis](https://github.com/decepulis)
- *(design)* Controls ([#456](https://github.com/videojs/v10/pull/456)) by [@mihar-22](https://github.com/mihar-22)
- *(design)* Slider ([#506](https://github.com/videojs/v10/pull/506)) by [@mihar-22](https://github.com/mihar-22)
- Add captions decision ([#611](https://github.com/videojs/v10/pull/611)) by [@sampotts](https://github.com/sampotts)
- *(design)* Add player-container separation decision ([#614](https://github.com/videojs/v10/pull/614)) by [@heff](https://github.com/heff)

### ⚡ Performance
- *(store)* Optimize reactive state hot paths ([#314](https://github.com/videojs/v10/pull/314)) by [@mihar-22](https://github.com/mihar-22)

### ⚙️ Miscellaneous Tasks
- Upgrade next to 16.0.10 ([#216](https://github.com/videojs/v10/pull/216)) by [@luwes](https://github.com/luwes)
- *(github)* Enable blank commits by [@mihar-22](https://github.com/mihar-22)
- *(root)* Prepare workspace for alpha ([#276](https://github.com/videojs/v10/pull/276)) by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Remove dom package by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Fix html and react deps by [@mihar-22](https://github.com/mihar-22)
- *(root)* Fix tsconfig references by [@mihar-22](https://github.com/mihar-22)
- Workspace improvements ([#282](https://github.com/videojs/v10/pull/282)) by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Add gh-issue and review-branch commands by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Remove `isolatedDeclarations` for store type inference support ([#295](https://github.com/videojs/v10/pull/295)) by [@mihar-22](https://github.com/mihar-22)
- *(root)* Cache lint-staged eslint calls by [@mihar-22](https://github.com/mihar-22)
- *(utils)* Fix broken badge by [@mihar-22](https://github.com/mihar-22)
- *(site)* Add sentry to astro's server config ([#299](https://github.com/videojs/v10/pull/299)) by [@daniel-hayes](https://github.com/daniel-hayes)
- *(ci)* Do not run on rfc/* branch by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Add skills system ([#310](https://github.com/videojs/v10/pull/310)) by [@mihar-22](https://github.com/mihar-22)
- *(root)* Archive examples into tech-preview ([#315](https://github.com/videojs/v10/pull/315)) by [@mihar-22](https://github.com/mihar-22)
- *(root)* Fix commitlint script by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Eslint + prettier → biome ([#325](https://github.com/videojs/v10/pull/325)) by [@sampotts](https://github.com/sampotts)
- *(claude)* Add claude-update skill by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Migrate commands to skills by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Add /create-skill by [@mihar-22](https://github.com/mihar-22)
- *(claude)* Add lit fundamentals by [@mihar-22](https://github.com/mihar-22)
- *(site)* Move to netlify ([#381](https://github.com/videojs/v10/pull/381)) by [@decepulis](https://github.com/decepulis)
- *(root)* Add postinstall symlinks for generic agents ([#447](https://github.com/videojs/v10/pull/447)) by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Add dev builds ([#452](https://github.com/videojs/v10/pull/452)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Format astro with biome by [@decepulis](https://github.com/decepulis)
- *(ci)* Add .zed/settings.json by [@decepulis](https://github.com/decepulis)
- *(packages)* Update tsdown to 0.20.3 by [@mihar-22](https://github.com/mihar-22)
- *(packages)* Resolve infinite dev rebuild loop in vite by [@mihar-22](https://github.com/mihar-22)
- *(site)* Configure netlify build and turbo-ignore by [@decepulis](https://github.com/decepulis)
- *(site)* Remove PostHog analytics ([#510](https://github.com/videojs/v10/pull/510)) by [@decepulis](https://github.com/decepulis)
- *(ci)* Add bundle size reporting workflow ([#511](https://github.com/videojs/v10/pull/511)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Fix bundle size measurement and format report ([#512](https://github.com/videojs/v10/pull/512)) by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Remove forced minimum fill on bundle size bars by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Show delta in bundle size bars instead of absolute size by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Add turbo caching and replace size-limit ([#524](https://github.com/videojs/v10/pull/524)) by [@mihar-22](https://github.com/mihar-22)
- *(site)* Audit and encode docs patterns ([#535](https://github.com/videojs/v10/pull/535)) by [@decepulis](https://github.com/decepulis)
- *(ci)* Add missing label workflow deps by [@mihar-22](https://github.com/mihar-22)
- *(root)* Add dependency graph to turbo dev and test tasks ([#540](https://github.com/videojs/v10/pull/540)) by [@decepulis](https://github.com/decepulis)
- *(ci)* Update Biome to latest and autofix ([#579](https://github.com/videojs/v10/pull/579)) by [@sampotts](https://github.com/sampotts)
- *(site)* Update Base UI from beta to stable release ([#610](https://github.com/videojs/v10/pull/610)) by [@decepulis](https://github.com/decepulis)
- *(packages)* Bump to 10.0.0-alpha.0 by [@decepulis](https://github.com/decepulis)

### New Contributors
* @dh-mux made their first contribution in [#581](https://github.com/videojs/v10/pull/581)
* @daniel-hayes made their first contribution in [#280](https://github.com/videojs/v10/pull/280)
* @LachlanRumery made their first contribution in [#211](https://github.com/videojs/v10/pull/211)

## [@videojs/core@0.1.0-preview.10] - 2025-12-06

### 🚀 Features
- *(site)* Add blog to navigation by [@decepulis](https://github.com/decepulis)
- *(site)* A few loading optimizations ([#193](https://github.com/videojs/v10/pull/193)) by [@decepulis](https://github.com/decepulis)
- Add console banner ([#186](https://github.com/videojs/v10/pull/186)) by [@luwes](https://github.com/luwes)
- Add tooltip core ([#212](https://github.com/videojs/v10/pull/212)) by [@luwes](https://github.com/luwes)

### 🐛 Bug Fixes
- Add popover core, use in html and improve factory ([#204](https://github.com/videojs/v10/pull/204)) by [@luwes](https://github.com/luwes)
- *(site)* Replace example mp4 with real by [@mihar-22](https://github.com/mihar-22)
- Use popover core in react popover ([#208](https://github.com/videojs/v10/pull/208)) by [@luwes](https://github.com/luwes)
- ToKebabCase import issue by [@luwes](https://github.com/luwes)
- *(demo)* Upgrade next and react dependencies by [@luwes](https://github.com/luwes)

### ⚙️ Miscellaneous Tasks
- *(root)* Update readme and contributing by [@mihar-22](https://github.com/mihar-22)
- *(root)* Update contributing by [@mihar-22](https://github.com/mihar-22)
- *(root)* Fix broken links in contributing by [@mihar-22](https://github.com/mihar-22)
- *(root)* Clean up links in readme by [@mihar-22](https://github.com/mihar-22)
- *(root)* Add community links to new issue page by [@mihar-22](https://github.com/mihar-22)
- *(root)* Disable blank issues from new issue page by [@mihar-22](https://github.com/mihar-22)
- *(ci)* Add action to label issues by [@mihar-22](https://github.com/mihar-22)
- *(examples)* Remove `-demo` suffix on dir names by [@mihar-22](https://github.com/mihar-22)

## [@videojs/core@0.1.0-preview.9] - 2025-11-18

### 🚀 Features
- *(site)* Llms.txt ([#184](https://github.com/videojs/v10/pull/184)) by [@decepulis](https://github.com/decepulis)
- *(site)* Migrate blog, with canonicals to v8 by [@decepulis](https://github.com/decepulis)

### 🐛 Bug Fixes
- Anchor name in popover and tooltip ([#194](https://github.com/videojs/v10/pull/194)) by [@luwes](https://github.com/luwes)
- Clean up core, less seams in wrappers ([#197](https://github.com/videojs/v10/pull/197)) by [@luwes](https://github.com/luwes)
- Fix CLS due to popover attribute not SSR ([#202](https://github.com/videojs/v10/pull/202)) by [@luwes](https://github.com/luwes)

### ⚙️ Miscellaneous Tasks
- *(site)* Add sitemap to robots.txt by [@decepulis](https://github.com/decepulis)
- Workaround race condition build-styles.ts ([#196](https://github.com/videojs/v10/pull/196)) by [@luwes](https://github.com/luwes)

## [@videojs/core@0.1.0-preview.8] - 2025-11-12

### 🐛 Bug Fixes
- *(site)* Idle load analytics ([#188](https://github.com/videojs/v10/pull/188)) by [@decepulis](https://github.com/decepulis)
- Hydration mismatch in Tooltip and Popover ([#190](https://github.com/videojs/v10/pull/190)) by [@luwes](https://github.com/luwes)

## [@videojs/core@0.1.0-preview.7] - 2025-11-11

### 🚀 Features
- Use anchor API for html elements ([#174](https://github.com/videojs/v10/pull/174)) by [@luwes](https://github.com/luwes)
- *(react)* Use popover and anchor position API ([#178](https://github.com/videojs/v10/pull/178)) by [@luwes](https://github.com/luwes)

### 🐛 Bug Fixes
- *(skins)* Slightly more idiomatic Tailwind, added custom properties ([#175](https://github.com/videojs/v10/pull/175)) by [@sampotts](https://github.com/sampotts)
- *(react)* Dependency bug by [@luwes](https://github.com/luwes)
- *(skins)* Remove vjs- prefixed CSS custom properties ([#179](https://github.com/videojs/v10/pull/179)) by [@sampotts](https://github.com/sampotts)

### ⚙️ Miscellaneous Tasks
- *(site)* Begin v8 page migration ([#177](https://github.com/videojs/v10/pull/177)) by [@decepulis](https://github.com/decepulis)
- *(site)* Update eject code generator by [@luwes](https://github.com/luwes)

## [@videojs/core@0.1.0-preview.6] - 2025-11-06

### 🚀 Features
- *(site)* Restore docs sidebar state on navigation ([#160](https://github.com/videojs/v10/pull/160)) by [@decepulis](https://github.com/decepulis)
- *(site)* Search ([#165](https://github.com/videojs/v10/pull/165)) by [@decepulis](https://github.com/decepulis)
- *(react)* Use SimpleVideo as default Video and rename HLS version to HlsVideo ([#171](https://github.com/videojs/v10/pull/171)) by [@cjpillsbury](https://github.com/cjpillsbury)

### 🐛 Bug Fixes
- *(site)* Correct style import for skins by [@decepulis](https://github.com/decepulis)
- *(react, html)* Rename MediaProvider (and related) to VideoProvider ([#159](https://github.com/videojs/v10/pull/159)) by [@cjpillsbury](https://github.com/cjpillsbury)
- *(site)* Update discord link ([#170](https://github.com/videojs/v10/pull/170)) by [@heff](https://github.com/heff)

### 📚 Documentation
- Readme and contributing docs updates ([#167](https://github.com/videojs/v10/pull/167)) by [@cjpillsbury](https://github.com/cjpillsbury)
- Cleanup issues with previous pass on readme and contributing ([#168](https://github.com/videojs/v10/pull/168)) by [@cjpillsbury](https://github.com/cjpillsbury)
- More minor issue cleanup ([#169](https://github.com/videojs/v10/pull/169)) by [@cjpillsbury](https://github.com/cjpillsbury)
- Update site/README and add site/CLAUDE ([#172](https://github.com/videojs/v10/pull/172)) by [@decepulis](https://github.com/decepulis)

### ⚙️ Miscellaneous Tasks
- Consolidate eject examples ([#162](https://github.com/videojs/v10/pull/162)) by [@decepulis](https://github.com/decepulis)
- Add templates for well defined issue and discussion types ([#164](https://github.com/videojs/v10/pull/164)) by [@cjpillsbury](https://github.com/cjpillsbury)
- Discussion template naming convention ([#166](https://github.com/videojs/v10/pull/166)) by [@cjpillsbury](https://github.com/cjpillsbury)
- *(site)* Add trademark notice to footer ([#163](https://github.com/videojs/v10/pull/163)) by [@heff](https://github.com/heff)

## [@videojs/core@0.1.0-preview.5] - 2025-11-03

### 🚀 Features
- Eject examples ([#149](https://github.com/videojs/v10/pull/149)) by [@decepulis](https://github.com/decepulis)
- *(site)* Remove unnecessary hydration workarounds by [@decepulis](https://github.com/decepulis)
- *(site)* Add aside component by [@decepulis](https://github.com/decepulis)
- *(site)* Restrict dev mode analytics by [@decepulis](https://github.com/decepulis)
- *(site)* Prefetch links that require redirects by [@decepulis](https://github.com/decepulis)
- *(site)* Prefetch all links by [@decepulis](https://github.com/decepulis)
- *(site)* Film grain ([#150](https://github.com/videojs/v10/pull/150)) by [@decepulis](https://github.com/decepulis)
- Update html tooltip API / use command attr ([#151](https://github.com/videojs/v10/pull/151)) by [@luwes](https://github.com/luwes)

### 🐛 Bug Fixes
- *(site)* Scope HTML notice to HTML pages by [@decepulis](https://github.com/decepulis)
- Connect html eject skins to media-provider by [@decepulis](https://github.com/decepulis)
- *(site)* Update discord invite URL by [@decepulis](https://github.com/decepulis)
- *(site)* Shrink Aside and Blockquote child margins by [@decepulis](https://github.com/decepulis)
- Correct import on home page minimal skin by [@decepulis](https://github.com/decepulis)
- *(site)* Adjust footer for safari and firefox by [@decepulis](https://github.com/decepulis)
- *(site)* Improve legibility of aside by [@decepulis](https://github.com/decepulis)
- *(site)* Improve header typography by [@decepulis](https://github.com/decepulis)
- *(site)* Apply body background color by [@decepulis](https://github.com/decepulis)
- *(site)* Tighten mobile framework selector by [@decepulis](https://github.com/decepulis)
- *(site)* Stretch docs sidebar on desktop to prevent safari visual bug by [@decepulis](https://github.com/decepulis)
- *(site)* Improve mobile home page spacing by [@decepulis](https://github.com/decepulis)
- *(site)* Raise component demos above texture by [@decepulis](https://github.com/decepulis)
- *(site)* More reliable tabs ([#153](https://github.com/videojs/v10/pull/153)) by [@decepulis](https://github.com/decepulis)
- *(site)* Use MediaProvider on home page ([#154](https://github.com/videojs/v10/pull/154)) by [@decepulis](https://github.com/decepulis)
- *(docs)* Fix repo links in CONTRIBUTING.md by [@heff](https://github.com/heff)

### 📚 Documentation
- *(site)* Typo by [@mihar-22](https://github.com/mihar-22)
- Specify npm dist tag ([#155](https://github.com/videojs/v10/pull/155)) by [@decepulis](https://github.com/decepulis)

### ⚙️ Miscellaneous Tasks
- Update html demo to trigger build :( by [@luwes](https://github.com/luwes)
- *(site)* Update discord link ([#156](https://github.com/videojs/v10/pull/156)) by [@heff](https://github.com/heff)

### ◀️ Revert
- *(site)* Remove unnecessary hydration workarounds by [@decepulis](https://github.com/decepulis)

## [@videojs/core@0.1.0-preview.4] - 2025-10-30

### 🚀 Features
- *(html)* Add element registrations by [@mihar-22](https://github.com/mihar-22)

### 📚 Documentation
- Initial concepts and recipes ([#147](https://github.com/videojs/v10/pull/147)) by [@decepulis](https://github.com/decepulis)
- *(site)* Update element imports by [@mihar-22](https://github.com/mihar-22)

### ⚙️ Miscellaneous Tasks
- *(packages)* Move dom types down by [@mihar-22](https://github.com/mihar-22)
- *(root)* Update architecture docs by [@mihar-22](https://github.com/mihar-22)
- *(root)* Add timeline by [@mihar-22](https://github.com/mihar-22)
- *(site)* Add dom lib types by [@mihar-22](https://github.com/mihar-22)
- *(root)* Fix architecture link in readme by [@mihar-22](https://github.com/mihar-22)
- *(root)* Add contributing.md by [@mihar-22](https://github.com/mihar-22)
- *(root)* Update claude.md by [@mihar-22](https://github.com/mihar-22)
- *(root)* Remove bbb.mp4 by [@mihar-22](https://github.com/mihar-22)

## [@videojs/core@0.1.0-preview.3] - 2025-10-29

### 🚀 Features
- *(ui)* Skin design improvements, add html frosted skin (WIP) ([#133](https://github.com/videojs/v10/pull/133)) by [@sampotts](https://github.com/sampotts)
- *(skins)* Add html port of minimal skin ([#140](https://github.com/videojs/v10/pull/140)) by [@sampotts](https://github.com/sampotts)
- *(website)* Update favicon and theme color based on dark mode by [@decepulis](https://github.com/decepulis)
- *(site)* Raise prominence of home page demo toggles by [@decepulis](https://github.com/decepulis)
- Idiomatic html markup, use popover API, add safe polygon utility ([#143](https://github.com/videojs/v10/pull/143)) by [@luwes](https://github.com/luwes)
- *(site)* Tabs ([#144](https://github.com/videojs/v10/pull/144)) by [@decepulis](https://github.com/decepulis)

### 🐛 Bug Fixes
- Add viewport meta element ([#135](https://github.com/videojs/v10/pull/135)) by [@sampotts](https://github.com/sampotts)
- Add aspect-ratio to demos ([#136](https://github.com/videojs/v10/pull/136)) by [@sampotts](https://github.com/sampotts)
- Remove `show-remaining` in HTML example ([#137](https://github.com/videojs/v10/pull/137)) by [@sampotts](https://github.com/sampotts)
- *(packages)* Update version badges ([#138](https://github.com/videojs/v10/pull/138)) by [@mihar-22](https://github.com/mihar-22)
- *(react)* Prevent dev build race condition ([#139](https://github.com/videojs/v10/pull/139)) by [@sampotts](https://github.com/sampotts)
- *(website)* Improve legibility with heavier font weight ([#141](https://github.com/videojs/v10/pull/141)) by [@decepulis](https://github.com/decepulis)
- Visually hidden focus guards ([#142](https://github.com/videojs/v10/pull/142)) by [@luwes](https://github.com/luwes)
- Add aria-hidden to focus guards by [@luwes](https://github.com/luwes)
- *(utils)* Remove unnecessary keyboard utils ([#146](https://github.com/videojs/v10/pull/146)) by [@luwes](https://github.com/luwes)

### 📚 Documentation
- Initial component examples ([#123](https://github.com/videojs/v10/pull/123)) by [@cjpillsbury](https://github.com/cjpillsbury)

### ⚙️ Miscellaneous Tasks
- *(root)* Ignore linting commits starting with wip by [@mihar-22](https://github.com/mihar-22)
- *(website)* Hide blog by [@decepulis](https://github.com/decepulis)
- *(website)* Update roadmap by [@decepulis](https://github.com/decepulis)
- *(react)* Add postcss-prefix-selector types by [@mihar-22](https://github.com/mihar-22)
- *(site)* Rename website to site by [@decepulis](https://github.com/decepulis)
- Update repo URLs ([#145](https://github.com/videojs/v10/pull/145)) by [@luwes](https://github.com/luwes)
- *(site)* Update privacy policy by [@decepulis](https://github.com/decepulis)

## [@videojs/core@0.1.0-preview.2] - 2025-10-25

### 🐛 Bug Fixes
- *(root)* Remove dry-run from publish command by [@luwes](https://github.com/luwes)
- *(core)* Update README to use v10 terminology by [@luwes](https://github.com/luwes)

## [@videojs/core@0.1.0-preview.1] - 2025-10-25

### 🚀 Features
- Initialize Video.js 10 monorepo with core architecture by [@cjpillsbury](https://github.com/cjpillsbury)
- *(monorepo)* Migrate prototype code to organized package structure by [@cjpillsbury](https://github.com/cjpillsbury)
- Migrate entire monorepo from tsc to tsup for production builds by [@cjpillsbury](https://github.com/cjpillsbury)
- Migrate examples from prototype and add CSS modules support by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Enable automatic CSS injection for MediaSkinDefault component by [@cjpillsbury](https://github.com/cjpillsbury)
- *(workspace)* Implement Turbo for build optimization and caching by [@cjpillsbury](https://github.com/cjpillsbury)
- *(icons)* Implement shared SVG icon system across packages by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react-icons)* Implement SVGR-powered auto-generation with full styling support by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react-media-store)* Add shallowEqual utility for optimized state comparisons by [@cjpillsbury](https://github.com/cjpillsbury)
- *(examples)* Configure separate default ports for React and HTML demos by [@cjpillsbury](https://github.com/cjpillsbury)
- *(core)* Implement temporal state management for time-based media controls by [@cjpillsbury](https://github.com/cjpillsbury)
- *(core,html,react)* Implement VolumeRange component with integrated state management by [@cjpillsbury](https://github.com/cjpillsbury)
- *(media-store,html,react)* Implement TimeRange component with hook-style architecture by [@cjpillsbury](https://github.com/cjpillsbury)
- *(icons)* Add fullscreen enter and exit icons by [@cjpillsbury](https://github.com/cjpillsbury)
- *(media-store)* Add fullscreen state mediator with shadow DOM support by [@cjpillsbury](https://github.com/cjpillsbury)
- *(media-store)* Add fullscreen button component state definition by [@cjpillsbury](https://github.com/cjpillsbury)
- *(html)* Add fullscreen button component and icons by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Add fullscreen button component by [@cjpillsbury](https://github.com/cjpillsbury)
- *(html)* Integrate fullscreen button into control bar and improve container lifecycle by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Add MediaContainer component for fullscreen functionality by [@cjpillsbury](https://github.com/cjpillsbury)
- *(media-store)* Add comprehensive time formatting utilities by [@cjpillsbury](https://github.com/cjpillsbury)
- *(media-store)* Add duration display component state definition by [@cjpillsbury](https://github.com/cjpillsbury)
- *(html)* Implement duration display component by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Implement duration display component by [@cjpillsbury](https://github.com/cjpillsbury)
- *(skins)* Integrate duration display into default skins by [@cjpillsbury](https://github.com/cjpillsbury)
- Implement current time display components by [@cjpillsbury](https://github.com/cjpillsbury)
- Add showRemaining functionality to current time display by [@cjpillsbury](https://github.com/cjpillsbury)
- Make time range compound component ([#10](https://github.com/videojs/v10/pull/10)) by [@luwes](https://github.com/luwes)
- Add compound html timerange component ([#14](https://github.com/videojs/v10/pull/14)) by [@luwes](https://github.com/luwes)
- *(ui)* Port over default skin by [@sampotts](https://github.com/sampotts)
- *(ui)* Minor style tweaks by [@sampotts](https://github.com/sampotts)
- Add volume range compound component ([#19](https://github.com/videojs/v10/pull/19)) by [@luwes](https://github.com/luwes)
- Add core range, time and volume range ([#23](https://github.com/videojs/v10/pull/23)) by [@luwes](https://github.com/luwes)
- Add range orientation to react components ([#30](https://github.com/videojs/v10/pull/30)) by [@luwes](https://github.com/luwes)
- Add HTML vertical orientation to time and volume ([#32](https://github.com/videojs/v10/pull/32)) by [@luwes](https://github.com/luwes)
- Add popover React component ([#33](https://github.com/videojs/v10/pull/33)) by [@luwes](https://github.com/luwes)
- Add media-popover, cleanup html demo ([#34](https://github.com/videojs/v10/pull/34)) by [@luwes](https://github.com/luwes)
- *(ui)* Add toasted skin by [@sampotts](https://github.com/sampotts)
- *(ui)* Styling fixes for toasted skin ([#38](https://github.com/videojs/v10/pull/38)) by [@sampotts](https://github.com/sampotts)
- Add React tooltip component ([#35](https://github.com/videojs/v10/pull/35)) by [@luwes](https://github.com/luwes)
- Add HTML tooltip component ([#40](https://github.com/videojs/v10/pull/40)) by [@luwes](https://github.com/luwes)
- Add transition status to React tooltip ([#42](https://github.com/videojs/v10/pull/42)) by [@luwes](https://github.com/luwes)
- Rename range to slider ([#46](https://github.com/videojs/v10/pull/46)) by [@luwes](https://github.com/luwes)
- *(ui)* Micro icons, toasted design tweaks ([#52](https://github.com/videojs/v10/pull/52)) by [@sampotts](https://github.com/sampotts)
- *(ui)* More skin style tweaks ([#53](https://github.com/videojs/v10/pull/53)) by [@sampotts](https://github.com/sampotts)
- Add a solution for React preview time display ([#50](https://github.com/videojs/v10/pull/50)) by [@luwes](https://github.com/luwes)
- Add html preview time display ([#58](https://github.com/videojs/v10/pull/58)) by [@luwes](https://github.com/luwes)
- Add tooltip transition status by [@luwes](https://github.com/luwes)
- *(ui)* Skin and icon tweaks ([#59](https://github.com/videojs/v10/pull/59)) by [@sampotts](https://github.com/sampotts)
- Add data style attributes to popover ([#62](https://github.com/videojs/v10/pull/62)) by [@luwes](https://github.com/luwes)
- Website ([#45](https://github.com/videojs/v10/pull/45)) by [@decepulis](https://github.com/decepulis)
- *(website)* Add posthog analytics ([#71](https://github.com/videojs/v10/pull/71)) by [@decepulis](https://github.com/decepulis)
- *(website)* Favicon by [@decepulis](https://github.com/decepulis)
- Add focus state to sliders and volume slider ([#60](https://github.com/videojs/v10/pull/60)) by [@luwes](https://github.com/luwes)
- *(website)* Discord link by [@decepulis](https://github.com/decepulis)
- *(website)* Social links in footer by [@decepulis](https://github.com/decepulis)
- *(website)* Init dark mode by [@decepulis](https://github.com/decepulis)
- Add keyboard control to sliders ([#115](https://github.com/videojs/v10/pull/115)) by [@luwes](https://github.com/luwes)
- *(react)* Add Tailwind v4 compiled CSS for skins with vjs prefix ([#114](https://github.com/videojs/v10/pull/114)) by [@cjpillsbury](https://github.com/cjpillsbury)
- Add display click to play / pause ([#117](https://github.com/videojs/v10/pull/117)) by [@luwes](https://github.com/luwes)
- *(react)* Adding simple video ([#125](https://github.com/videojs/v10/pull/125)) by [@cjpillsbury](https://github.com/cjpillsbury)
- *(ui)* Skin design tweaks ([#126](https://github.com/videojs/v10/pull/126)) by [@sampotts](https://github.com/sampotts)

### 🐛 Bug Fixes
- *(config)* Remove duplicate noImplicitReturns key in tsconfig.base.json by [@cjpillsbury](https://github.com/cjpillsbury)
- *(workspace)* Convert pnpm workspace protocol to npm workspace syntax by [@cjpillsbury](https://github.com/cjpillsbury)
- Resolve TypeScript build errors across packages by [@cjpillsbury](https://github.com/cjpillsbury)
- *(workspace)* Correct build:libs command to use explicit package names by [@cjpillsbury](https://github.com/cjpillsbury)
- *(typescript)* Resolve declaration file generation for rollup packages ([#1](https://github.com/videojs/v10/pull/1)) by [@cjpillsbury](https://github.com/cjpillsbury)
- Resolve package dependency and TypeScript export issues by [@cjpillsbury](https://github.com/cjpillsbury)
- Resolve @open-wc/context-protocol module resolution issues by [@cjpillsbury](https://github.com/cjpillsbury)
- Refactor private fields to public with underscore convention by [@cjpillsbury](https://github.com/cjpillsbury)
- Clean up more typescript errors. by [@cjpillsbury](https://github.com/cjpillsbury)
- *(media)* Use explicit exports to resolve React package TypeScript errors by [@cjpillsbury](https://github.com/cjpillsbury)
- *(media-store)* Resolve TypeScript error in dispatch method by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Implement proper HTML boolean data attributes for components by [@cjpillsbury](https://github.com/cjpillsbury)
- *(media-store)* Resolve TypeScript declaration generation build issues by [@cjpillsbury](https://github.com/cjpillsbury)
- *(media-store)* Replace tsup with rollup for consistent build tooling by [@cjpillsbury](https://github.com/cjpillsbury)
- *(icons)* Add currentColor fill to fullscreen icons for proper theming by [@cjpillsbury](https://github.com/cjpillsbury)
- *(time-display)* Clean up time utilities and simplify components by [@cjpillsbury](https://github.com/cjpillsbury)
- Seek jump back to current time ([#22](https://github.com/videojs/v10/pull/22)) by [@luwes](https://github.com/luwes)
- Add missing prettier plugin (remove later) by [@sampotts](https://github.com/sampotts)
- Skin exports/imports by [@sampotts](https://github.com/sampotts)
- *(ui)* Revert style testing change by [@sampotts](https://github.com/sampotts)
- React version mismatch, add forward refs by [@luwes](https://github.com/luwes)
- Rename attributes to kebab-case by [@luwes](https://github.com/luwes)
- Enable eslint & run eslint:fix ([#43](https://github.com/videojs/v10/pull/43)) by [@luwes](https://github.com/luwes)
- Design tweaks to toasted skin, lint rule tweaks ([#44](https://github.com/videojs/v10/pull/44)) by [@sampotts](https://github.com/sampotts)
- Skin syntax usage cleanup ([#48](https://github.com/videojs/v10/pull/48)) by [@cjpillsbury](https://github.com/cjpillsbury)
- *(ui)* Tone down text shadow on toasted skin ([#54](https://github.com/videojs/v10/pull/54)) by [@sampotts](https://github.com/sampotts)
- Tooltip syntax error & remove restMs by [@luwes](https://github.com/luwes)
- *(website)* More consistent marquee speed + loop by [@decepulis](https://github.com/decepulis)
- *(website)* Align home page controls on mobile by [@decepulis](https://github.com/decepulis)
- Minimal volume slider bug & fix dev infinite bug ([#73](https://github.com/videojs/v10/pull/73)) by [@luwes](https://github.com/luwes)
- *(website)* Resolve Safari hydration error by [@decepulis](https://github.com/decepulis)
- *(website)* Footer link highlight scoping by [@decepulis](https://github.com/decepulis)
- *(website)* Mobile optimizations by [@decepulis](https://github.com/decepulis)
- *(website)* Lighter text in dark mode by [@decepulis](https://github.com/decepulis)
- *(website)* Turborepo cache vercel output ([#118](https://github.com/videojs/v10/pull/118)) by [@decepulis](https://github.com/decepulis)
- *(root)* Add videojs keyword to package.json by [@luwes](https://github.com/luwes)

### 💼 Other
- Refactor(html): implement hook-style component architecture for PlayButton and MuteButton by [@cjpillsbury](https://github.com/cjpillsbury)
- Removing react-native. Aiming for 18.x react dependencies cross-workspace to avoid bugs. ([#49](https://github.com/videojs/v10/pull/49)) by [@cjpillsbury](https://github.com/cjpillsbury)

### 🚜 Refactor
- Convert React Native packages to stubs and fix remaining build issues by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Replace tsup with rollup for proper CSS modules support by [@cjpillsbury](https://github.com/cjpillsbury)
- Migrate key packages from tsup to rollup for build consistency by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Consolidate MuteButton components into unified implementation by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Continue with component hooks rearchitecture. by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Implement hooks-based PlayButton architecture by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Create shared component factory for reusable architecture by [@cjpillsbury](https://github.com/cjpillsbury)
- *(html)* Implement hook-style component architecture for PlayButton and MuteButton (gradual migration to more shareable with React). by [@cjpillsbury](https://github.com/cjpillsbury)
- Standardize state property names across core, HTML, and React packages by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Implement hook-style component architecture for PlayButton by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react,html)* Implement hook-style component architecture for MuteButton by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react,html)* Implement hook-style component architecture for MuteButton by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react,html)* Update PlayButton to use centralized state definitions by [@cjpillsbury](https://github.com/cjpillsbury)
- *(core,react,html)* Migrate component state definitions to core media-store by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Consolidate Video component into single module by [@cjpillsbury](https://github.com/cjpillsbury)
- *(react)* Restructure VolumeRange to use render function pattern by [@cjpillsbury](https://github.com/cjpillsbury)
- *(html)* Update VolumeRange to use handleEvent pattern for consistency by [@cjpillsbury](https://github.com/cjpillsbury)
- *(media-store)* Replace mediaEvents with stateOwnersUpdateHandlers pattern by [@cjpillsbury](https://github.com/cjpillsbury)
- *(media-store)* Add container state owner and rename event types by [@cjpillsbury](https://github.com/cjpillsbury)
- *(html)* Remove temporary fullscreen test code from play button by [@cjpillsbury](https://github.com/cjpillsbury)
- Move time formatting logic to platform components by [@cjpillsbury](https://github.com/cjpillsbury)
- Rename formatDuration to formatDisplayTime by [@cjpillsbury](https://github.com/cjpillsbury)
- Remove container radius from the skin by [@sampotts](https://github.com/sampotts)

### 📚 Documentation
- Architecture docs ([#51](https://github.com/videojs/v10/pull/51)) by [@cjpillsbury](https://github.com/cjpillsbury)
- Architecture docs v2 ([#55](https://github.com/videojs/v10/pull/55)) by [@cjpillsbury](https://github.com/cjpillsbury)
- Readmes v0 ([#72](https://github.com/videojs/v10/pull/72)) by [@cjpillsbury](https://github.com/cjpillsbury)

### 🎨 Styling
- *(react-demo)* Clean up code formatting and video source organization by [@cjpillsbury](https://github.com/cjpillsbury)
- Add visual styling to time display components by [@cjpillsbury](https://github.com/cjpillsbury)

### ⚙️ Miscellaneous Tasks
- Remove debug console.log statements and fix TypeScript declarations by [@cjpillsbury](https://github.com/cjpillsbury)
- Add todo code comments. by [@cjpillsbury](https://github.com/cjpillsbury)
- Add todo code comments. by [@cjpillsbury](https://github.com/cjpillsbury)
- Remove range css from skins for now. by [@cjpillsbury](https://github.com/cjpillsbury)
- Swapping out m3u8 example asset for react demo. by [@cjpillsbury](https://github.com/cjpillsbury)
- Remove accidentally committed .playwright-mcp files by [@cjpillsbury](https://github.com/cjpillsbury)
- Add .playwright-mcp to .gitignore by [@cjpillsbury](https://github.com/cjpillsbury)
- Add prettier by [@mihar-22](https://github.com/mihar-22)
- Npm -> pnpm by [@mihar-22](https://github.com/mihar-22)
- New builds & types using tsdown ([#20](https://github.com/videojs/v10/pull/20)) by [@mihar-22](https://github.com/mihar-22)
- Gitignore cleanup ([#21](https://github.com/videojs/v10/pull/21)) by [@mihar-22](https://github.com/mihar-22)
- Add linting config by [@sampotts](https://github.com/sampotts)
- Cleanup demo config ([#28](https://github.com/videojs/v10/pull/28)) by [@mihar-22](https://github.com/mihar-22)
- Remove use-node-version, Vercel deployment by [@luwes](https://github.com/luwes)
- Add generate:icons to build dependsOn by [@luwes](https://github.com/luwes)
- Copy update to trigger a deploy ([#39](https://github.com/videojs/v10/pull/39)) by [@sampotts](https://github.com/sampotts)
- Website tooling ([#41](https://github.com/videojs/v10/pull/41)) by [@decepulis](https://github.com/decepulis)
- Consistent formatting ([#47](https://github.com/videojs/v10/pull/47)) by [@cjpillsbury](https://github.com/cjpillsbury)
- Fix dup React versions by [@luwes](https://github.com/luwes)
- Resolve alias during build ([#56](https://github.com/videojs/v10/pull/56)) by [@mihar-22](https://github.com/mihar-22)
- `__dirname` not defined  ([#57](https://github.com/videojs/v10/pull/57)) by [@mihar-22](https://github.com/mihar-22)
- Rename skins, minor style tweaks ([#61](https://github.com/videojs/v10/pull/61)) by [@sampotts](https://github.com/sampotts)
- *(website)* Error and artifact cleanup by [@decepulis](https://github.com/decepulis)
- Add CI build workflow by [@luwes](https://github.com/luwes)
- Fix html-demo not importing skin ([#127](https://github.com/videojs/v10/pull/127)) by [@mihar-22](https://github.com/mihar-22)
- *(root)* Add commitlint ([#129](https://github.com/videojs/v10/pull/129)) by [@mihar-22](https://github.com/mihar-22)
- *(cd)* Add release-please workflow ([#128](https://github.com/videojs/v10/pull/128)) by [@luwes](https://github.com/luwes)
- *(cd)* Add if statement to pnpm by [@luwes](https://github.com/luwes)

### New Contributors
* @github-actions[bot] made their first contribution in [#130](https://github.com/videojs/v10/pull/130)
* @luwes made their first contribution
* @mihar-22 made their first contribution in [#129](https://github.com/videojs/v10/pull/129)
* @sampotts made their first contribution in [#126](https://github.com/videojs/v10/pull/126)
* @cjpillsbury made their first contribution in [#125](https://github.com/videojs/v10/pull/125)
* @decepulis made their first contribution in [#118](https://github.com/videojs/v10/pull/118)
* @heff made their first contribution

[unreleased]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.8...HEAD
[@videojs/core@10.0.0-beta.8]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.7...@videojs/core@10.0.0-beta.8
[@videojs/core@10.0.0-beta.7]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.6...@videojs/core@10.0.0-beta.7
[@videojs/core@10.0.0-beta.6]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.5...@videojs/core@10.0.0-beta.6
[@videojs/core@10.0.0-beta.5]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.4...@videojs/core@10.0.0-beta.5
[@videojs/core@10.0.0-beta.4]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.3...@videojs/core@10.0.0-beta.4
[@videojs/core@10.0.0-beta.3]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.2...@videojs/core@10.0.0-beta.3
[@videojs/core@10.0.0-beta.2]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.1...@videojs/core@10.0.0-beta.2
[@videojs/core@10.0.0-beta.1]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.11...@videojs/core@10.0.0-beta.1
[@videojs/core@10.0.0-alpha.11]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.10...@videojs/core@10.0.0-alpha.11
[@videojs/core@10.0.0-alpha.10]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.9...@videojs/core@10.0.0-alpha.10
[@videojs/core@10.0.0-alpha.9]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.8...@videojs/core@10.0.0-alpha.9
[@videojs/core@10.0.0-alpha.8]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.7...@videojs/core@10.0.0-alpha.8
[@videojs/core@10.0.0-alpha.7]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.6...@videojs/core@10.0.0-alpha.7
[@videojs/core@10.0.0-alpha.6]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.5...@videojs/core@10.0.0-alpha.6
[@videojs/core@10.0.0-alpha.5]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.4...@videojs/core@10.0.0-alpha.5
[@videojs/core@10.0.0-alpha.4]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.3...@videojs/core@10.0.0-alpha.4
[@videojs/core@10.0.0-alpha.3]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.2...@videojs/core@10.0.0-alpha.3
[@videojs/core@10.0.0-alpha.2]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.1...@videojs/core@10.0.0-alpha.2
[@videojs/core@10.0.0-alpha.1]: https://github.com/videojs/v10/compare/@videojs/core@0.1.0-preview.10...@videojs/core@10.0.0-alpha.1
[@videojs/core@0.1.0-preview.10]: https://github.com/videojs/v10/compare/@videojs/core@0.1.0-preview.9...@videojs/core@0.1.0-preview.10
[@videojs/core@0.1.0-preview.9]: https://github.com/videojs/v10/compare/@videojs/core@0.1.0-preview.8...@videojs/core@0.1.0-preview.9
[@videojs/core@0.1.0-preview.8]: https://github.com/videojs/v10/compare/@videojs/core@0.1.0-preview.7...@videojs/core@0.1.0-preview.8
[@videojs/core@0.1.0-preview.7]: https://github.com/videojs/v10/compare/@videojs/core@0.1.0-preview.6...@videojs/core@0.1.0-preview.7
[@videojs/core@0.1.0-preview.6]: https://github.com/videojs/v10/compare/@videojs/core@0.1.0-preview.5...@videojs/core@0.1.0-preview.6
[@videojs/core@0.1.0-preview.5]: https://github.com/videojs/v10/compare/@videojs/core@0.1.0-preview.4...@videojs/core@0.1.0-preview.5
[@videojs/core@0.1.0-preview.4]: https://github.com/videojs/v10/compare/@videojs/core@0.1.0-preview.3...@videojs/core@0.1.0-preview.4
[@videojs/core@0.1.0-preview.3]: https://github.com/videojs/v10/compare/@videojs/core@0.1.0-preview.2...@videojs/core@0.1.0-preview.3
[@videojs/core@0.1.0-preview.2]: https://github.com/videojs/v10/compare/@videojs/core@0.1.0-preview.1...@videojs/core@0.1.0-preview.2

<!-- generated by git-cliff -->
