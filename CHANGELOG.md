## [unreleased]

### 🐛 Bug Fixes

- *(site)* Improve whitespace around links (#913)

## [@videojs/core@10.0.0-beta.5] - 2026-03-12

### 🐛 Bug Fixes

- *(skin)* Only set poster object-fit: contain in fullscreen (#906)
- *(site)* Include HLS CDN script in installation builder (#907)
- *(skin)* Scope controls transitions to fine pointer only (#909)
- *(cd)* Add @videojs/skins to release please (#910)

## [@videojs/core@10.0.0-beta.4] - 2026-03-12

### 🚀 Features

- *(spf)* Stream segment fetches via ReadableStream body (#890)

### 🐛 Bug Fixes

- *(site)* Work around video layout quirks in hero (#884)
- *(site)* Redirect trailing-slash URLs via edge function (#885)
- *(site)* Filter devOnly posts from RSS feed (#888)
- Attaching media like elements and upgrade (#889)
- *(skin)* Standardize backdrop-filter and fix minimal root sizing (#895)
- *(site)* Replace GA4 with PostHog cookieless analytics (#894)
- Mobile controls issues (#896)
- *(skin)* Add missing tooltip provider/group (#902)
- *(site)* Add playsinline to home and installation snippets (#897)
- *(core)* Skip delay when switching between grouped tooltips (#903)
- *(spf)* Propagate byteRange when building segment load tasks (#904)
- *(skin)* Fix fullscreen video clipping and border-radius handling (#905)

### ⚙️ Miscellaneous Tasks

- *(changelog)* Use one root level changelog (#900)
- *(changelog)* Fix changelog-path (#901)

## [@videojs/core@10.0.0-beta.3] - 2026-03-11

### 🚀 Features

- *(site)* Add optional OG image support to blog posts (#878)

### 🐛 Bug Fixes

- *(html)* Remove commented error dialog blocks from video skins (#865)
- *(site)* Add missing slot="media" to HTML demo video elements (#867)
- *(site)* Netlify aliases -> redirects (#868)
- *(site)* Use custom domain for og:image on production deploys (#880)
- *(html)* Fix html container sizing (#881)
- *(core)* Resolve pip state against media target (#883)
- *(skins)* Remove legacy caption markup artifacts (#882)

### ⚙️ Miscellaneous Tasks

- *(site)* Remove v8 link checker integration (#879)
- *(sandbox)* Sandbox cleanup (#797)

## [@videojs/core@10.0.0-beta.2] - 2026-03-10

### 🚀 Features

- *(site)* Use HlsVideo in homepage HeroVideo component (#854)
- *(html)* Add CDN bundles and inline template minification (#827)

### 🐛 Bug Fixes

- *(docs)* Update v10 blog post (#852)
- *(site)* Move legacy banner to base layout and fix mobile text size (#855)
- *(site)* Fix legacy banner layout on narrow viewports (#856)
- *(site)* Center-align radio option labels in ImageRadioGroup (#858)

### 📚 Documentation

- Discord link in blog post (#863)

### ⚙️ Miscellaneous Tasks

- *(site)* Migrate to videojs.org and clean up remaining redirects (#853)

## [@videojs/core@10.0.0-beta.1] - 2026-03-10

### 🚀 Features

- *(site)* Ejected skins build script, docs page, and home page wiring (#809)

### 🐛 Bug Fixes

- *(docs)* Update README contributing section for beta (#847)
- *(packages)* Update package READMEs for beta (#848)
- *(packages)* Set release-please manifest and package versions to beta.0 (#850)

### ⚙️ Miscellaneous Tasks

- *(cd)* Transition from alpha/next to beta/latest (#846)

## [@videojs/core@10.0.0-alpha.11] - 2026-03-10

### 🚀 Features

- *(spf)* Basic ManagedMediaSource support for Safari (#843)

### 🐛 Bug Fixes

- *(site)* Correct homepage download comparison (#823)
- *(site)* Use MUX_URL const with UTM params for mux.com links (#833)
- *(spf)* Prefer MediaSource over ManagedMediaSource (#838)
- *(spf)* Fix async teardown leaks and recreate engine on src change (#841)
- *(spf)* Add missing repository field (#844)

### 💼 Other

- Add default Mux sources to home and installation snippets (#815)
- Force release please, please (#829)

### 📚 Documentation

- Remove spread from videoFeatures examples (#816)
- *(site)* Remove TODO placeholders from installation copy (#820)
- Move videojs CSS imports to top in React snippets (#818)
- Add mux.com links in install/docs (#819)
- Fix install tab label casing (#822)
- Use framework exports in player API examples (#821)
- Add 'use client' to React install example (#825)
- Show HTML attribute name in API prop details (#817)
- Use Audio/Video labels on installation page (#824)
- V10 beta blog post (#811)

## [@videojs/core@10.0.0-alpha.10] - 2026-03-10

### 🚀 Features

- *(site)* New home page, docs, and design system (#566)
- *(skin)* Add audio skins for HTML and React presets (#772)
- *(sandbox)* Rebuild sandbox with shell UI and expanded templates (#773)
- *(site)* Darker dark mode footer (#780)
- *(sandbox)* Dark mode support and template entry files (#781)
- *(site)* Add cookieless Google Analytics (#788)
- *(site)* Add legacy docs banner and v8 links (#786)
- *(spf)* Initial push of SPF (#784)
- *(skin)* Port tooltip styling from tech preview (#800)

### 🐛 Bug Fixes

- *(ci)* Stabilize bundle size diff reporting for UI components (#761)
- *(html)* Apply popover data attributes before showing via popover API (#763)
- *(site)* Update mux sponsor language and alignment (#768)
- *(site)* Redirect /guides to legacy.videojs.org (#694)
- *(site)* Rebrand polish (#775)
- *(core)* Prevent slider track click from closing popover (#776)
- *(html)* Thumb edge alignment jump (#766)
- *(site)* Handle remote image URLs in Img component (#789)
- *(sandbox)* Use simpler web storage hook (#794)
- *(site)* Use Consent Mode v2 for cookieless Google Analytics (#795)
- *(core)* Optimistic current time update on seek to prevent slider snap-back (#799)
- *(site)* Allow exact tumblr image URL (#803)
- *(core)* Use composedPath for popover outside-click detection (#806)
- *(slider)* Keep pointer position after pointerleave (#807)

### 💼 Other

- *(spf)* Add spf to release please config (#796)

### 🚜 Refactor

- *(core)* Replace document listeners with pointer capture in slider (#762)

### 📚 Documentation

- Add captions button (#777)
- *(site)* React API reference styling sections use correct selectors (#785)

### ⚙️ Miscellaneous Tasks

- Update examples to have sidebar and more examples link on non (#767)
- *(packages)* Remove tech-preview package (#793)
- *(sandbox)* Add hls-video to new sandbox setup (NOTE: hls-video H… (#798)
- Gitignore `.claude/settings.local.json` (#770)
- *(sandbox)* Adding spf/simple-hls-video + filtering to only include CMAF/fmp4 sources (#802)
- *(skin)* Refactor tooltip/popover styles/classnames (#801)
- Fix repo biome lint errors (#804)

## [@videojs/core@10.0.0-alpha.9] - 2026-03-06

### 🚀 Features

- Add subtitles handling + captions core (#692)
- *(react)* Add alert dialog component (#739)
- *(html)* Add alert dialog element (#741)
- *(react)* Add alert dialog to video skin (#747)

### 🐛 Bug Fixes

- Destroy hls.js instance on media unmount (#749)
- *(ci)* Rework bundle size report (#745)
- Delegate not defining Delegate props (#751)
- *(core)* Auto-unmute on volume change and restore volume on unmute (#752)
- *(html)* Add destroy (#748)
- *(core)* Derive effective mute state for volume UI components (#753)
- *(core)* Use double-RAF in transition open to enable entry animations (#755)
- Ssr issue with hls.js (#758)
- TextTrackList and optimize (#760)

### ◀️ Revert

- *(html)* Remove double raf hls destroy (#754)

## [@videojs/core@10.0.0-alpha.8] - 2026-03-05

### 🚀 Features

- Small state and naming fixes  (#719)
- *(html)* Add slider thumbnail element (#714)
- *(react)* Add slider thumbnail component (#722)
- *(react)* Add slider preview component (#710)
- *(html)* Add slider preview element (#733)
- *(core)* Add tooltip  (#734)
- *(html)* Add tooltip element (#735)
- *(react)* Add tooltip component (#736)
- *(core)* Add error feature (#713)
- *(core)* Add AlertDialog data attributes (#738)
- *(core)* Add alert dialog with dismiss layer and transitions (#743)

### 🐛 Bug Fixes

- *(react)* Set anchor-name and position-anchor imperatively in popover (#715)
- *(html)* Slider interaction and edge alignment broken (#721)
- *(site)* Add missing slot="media" to renderer element in HTML code block (#737)
- *(ci)* Reuse diagnosis comment per PR instead of per run (#740)
- *(react)* Strict mode support (#742)

### 📚 Documentation

- Add type module to cdn imports

## [@videojs/core@10.0.0-alpha.7] - 2026-03-04

### 🐛 Bug Fixes

- *(html,react)* Move @videojs/skins to devDependencies (#716)

## [@videojs/core@10.0.0-alpha.6] - 2026-03-04

### 🐛 Bug Fixes

- *(site)* Reset installation guide to implemented features (#707)
- *(core)* Use camelCase attribute names in slider for react (#708)
- *(ci)* Prevent shell injection from PR title/body in sync workflow (#711)
- *(html)* Move @videojs/icons to devDependencies (#712)

## [@videojs/core@10.0.0-alpha.5] - 2026-03-04

### 🚀 Features

- *(react)* Support native caption track shifting in video skins (#636)
- *(react)* Add playback rate button component (#639)
- *(packages)* Add PlaybackRateButton to core, html, and react (#642)
- *(core)* Add thumbnail component and text track store feature (#643)
- *(html)* Add thumbnail element (#646)
- *(react)* Add thumbnail component (#648)
- *(core)* Add popover component (#615)
- *(html)* Add popover element (#652)
- *(react)* Add popover component (#653)
- *(react)* Add slider component (#644)
- *(react)* Add time slider component (#647)
- *(html)* Add slider element (#655)
- *(html)* Add time slider element (#656)
- *(html)* Add volume slider element (#657)
- *(react)* Port time slider styling into video skin presets (#666)
- *(react)* Port volume popover and slider styling into skin presets (#667)
- *(react)* Orientation-aware buffer styling and slider improvements (#671)
- *(sandbox)* Add README and sync script (#673)
- *(ci)* Add weekly project report workflow (#665)
- *(ci)* Add issue-to-pr claude workflow (#675)
- *(ci)* Add api-reference sync agent workflow (#676)
- *(site)* Split llms.txt into per-framework and blog sub-indexes (#697)
- *(site)* Add TimeSlider, VolumeSlider, Popover API references (#685)
- *(skin)* Implement default and minimal skins for HTML player (#698)
- *(site)* Replace home page tech preview player with real player (#580)

### 🐛 Bug Fixes

- *(skin)* Temporarily hide the caption button (#629)
- Revert preset provider (#631)
- Add SSR stubs for HLS media (#641)
- *(ci)* Allow OIDC token in issue sync workflow (#661)
- *(ci)* Reduce issue sync permission denials (#662)
- *(react)* Use relative import path for useForceRender (#669)
- *(react)* Correct buffer selector names in minimal skin CSS (#672)
- *(site)* Strip script and style tags from llms markdown output (#678)
- *(site)* Review cleanup for API reference pages (#685)
- *(html)* Prevent tsdown from stripping custom element registrations (#703)
- *(site)* Skip error pages and strip styles in llms-markdown integration (#706)

### 🚜 Refactor

- *(html)* Separate provider and container concerns in createPlayer (#635)
- *(packages)* Move feature presets to subpath exports (#633)
- *(html)* Split UI define modules and narrow slider imports (#659)
- *(packages)* Dry up core, html, and react UI architecture (#699)
- *(ci)* Split api-reference sync into three focused jobs (#677)

### 📚 Documentation

- *(design)* PlaybackRateButton component spec (#624)
- *(site)* Use createPlayer in React installation code generator (#634)
- *(site)* Add thumbnail reference page  (#654)
- *(root)* Update timeline dates for alpha and beta

### ⚙️ Miscellaneous Tasks

- *(ci)* Add issue sync workflow (#660)
- *(ci)* Migrate issue triage workflow to Claude agent (#663)
- *(ci)* Add explicit checks and Claude diagnosis (#664)
- *(ci)* Remove weekly project report workflow (#680)
- *(claude)* Add session start hook to run gh-setup-hooks (#700)

## [@videojs/core@10.0.0-alpha.4] - 2026-02-26

### 🚀 Features

- Add background video preset (#607)

### 🐛 Bug Fixes

- *(react)* Move @videojs/icons to devDependencies
- *(react)* Update lockfile for icons dependency move

## [@videojs/core@10.0.0-alpha.3] - 2026-02-26

### 🐛 Bug Fixes

- *(cd)* Add repository field to all packages for provenance verification

## [@videojs/core@10.0.0-alpha.2] - 2026-02-26

### 🚀 Features

- *(cd)* Switch to npm trusted publishers

## [@videojs/core@10.0.0-alpha.1] - 2026-02-26

### 🚀 Features

- *(example/react)* Improvements to react examples (#210)
- *(core)* Add user activity logic (#278)
- *(store)* Initial release (#279)
- *(store)* Add error codes (#284)
- *(store)* Queue task refactor (#287)
- *(store)* React bindings (#288)
- *(core)* Dom media slices (#292)
- *(store)* Lit bindings (#289)
- *(react)* Add video component and utility hooks (#293)
- *(store)* UseMutation hook for react (#290)
- *(store)* UseOptimistic hook for react (#291)
- *(store)* Lit bound controllers (#297)
- *(store)* Skin store setup (#298)
- *(store)* Sync queue (#308)
- *(store)* Add reactive state primitives (#311)
- *(store)* Align queue with native (#312)
- *(store)* Store selector api (#370)
- *(core)* Add player target and feature selectors (#371)
- *(react)* Setup react player api (#372)
- *(html)* Setup player api (#374)
- *(html)* Add `PlayerElement` to `createPlayer` (#376)
- *(site)* Remove style from urls (#378)
- *(site)* Add interactive getting started guide (#280)
- *(core)* Add play button component (#383)
- *(core)* Add mute button component (#455)
- *(site)* Extract api reference from components (#464)
- *(core)* Add presentation feature (#458)
- *(core)* Add time display component (#460)
- *(core)* Add fullscreen button component (#459)
- *(site)* Generated multipart component api reference (#468)
- *(sandbox)* Add private sandbox package for internal testing (#478)
- *(html)* Reorganize import paths by use case (#480)
- *(site)* Perform /docs redirect client-side
- *(site)* Simple api reference examples (#472)
- *(site)* Add display font
- *(core)* Add poster component (#457)
- *(element)* Add lightweight reactive element base (#513)
- *(core)* Add controls component with activity tracking (#514)
- *(site)* Basic 404 and 500 pages
- *(site)* Controls API reference
- *(site)* Poster API reference
- *(site)* Clean up api reference header hierarchy
- *(core)* Add pip button component (#525)
- *(core)* Add seek button component (#526)
- *(core)* Add buffering indicator component (#527)
- *(store)* State subscription primitives (#528)
- *(packages)* Add slider core layer (#529)
- *(site)* Add pip button api reference
- *(site)* Add seek button api reference
- *(site)* Add buffering indicator api reference
- *(react)* Initial skin scaffolding (#523)
- *(icons)* Setup icons package (#536)
- *(site)* Add Mux health check action (#542)
- *(site)* Framework-specific SEO metadata for docs (#541)
- Add media API + HLS video components (#507)
- *(react)* Implement default and minimal video skins (#550)
- *(react)* Implement video skins with responsive layout (#568)
- *(site)* Add markdown content negotiation via Netlify edge function (#573)
- *(react)* Add captions styling to video skins (#582)
- Add background video components (#567)
- *(react)* Add Tailwind ejected video skins (#589)
- Add media delegate mixin (#598)
- *(site)* Add util reference pipeline (#537)
- *(skin)* Add error dialogs (#603)
- *(site)* Preserve scroll position on framework switch (pagereveal) (#608)
- *(skin)* Add captions button to video skins (#612)
- *(core)* Add slider dom (#613)
- *(site)* Source URL auto-detection for installation page (#619)

### 🐛 Bug Fixes

- *(core)* Fixed fullscreen on ios safari (#211)
- *(example/react)* Fix routing on vercel (#217)
- *(examples)* Fix CSS consistency issues (#309)
- *(store)* Guard abort on request supersession (#313)
- *(site)* Style overflowing tables
- Update npm install paths (#379)
- *(site)* Apply dark mode to code blocks
- *(site)* Correct table overscroll indicator color in dark mode
- *(docs)* Updating installation langauge
- *(docs)* Add audio to getting started guide and other updates
- *(ci)* Work around false-positive biome / astro errors
- *(packages)* Enable unbundle mode to avoid mangled exports
- *(html)* Discover media elements and attach store target via DOM (#481)
- *(site)* Improve initial demo css
- *(site)* Improve time demo css
- *(site)* Don't hit archive.org during build
- *(site)* Show docs sidebar on tablet
- *(site)* Clarify "Copy as Markdown" button
- *(site)* Support satisfies in api-docs data attrs extraction (#517)
- *(site)* Resolve aliased part descriptions in api docs (#518)
- *(site)* Use first-match-wins for multipart primary selection (#519)
- *(site)* Strip trailing slashes from pathname when copying markdown
- *(ci)* Fix website tests workflow (#565)
- *(core)* Fix circular import and simplify media types (#569)
- *(site)* Use astro:env for server-only environment variables (#574)
- Use cross-platform Node script for postinstall symlinks (#577)
- *(cd)* Use namespace imports for actions packages (#583)
- *(site)* Improve auth popup size and clean up Mux links (#587)
- *(site)* Upgrade to React 19 to resolve invalid hook call (#597)
- *(site)* Work around Astro SSR false "Invalid hook call" warnings (#600)
- *(sandbox)* Update style path in index.html (#604)
- *(site)* Add missing background-video media element import (#605)
- *(site)* Disable Netlify edge functions in dev to prevent Deno OOM (#620)
- *(site)* Resolve biome lint warnings (#602)
- *(core)* Preserve user props in time slider (#621)

### 🚜 Refactor

- *(store)* Remove partial slice state updates (#296)
- *(store)* Queue simplification (#302)
- *(store)* Rename slice to feature (#318)
- *(store)* Simplify state management + computeds (#321)
- *(store)* Use undefined instead of null for void-input placeholder (#322)
- *(store)* Flatten store/queue state (#326)
- *(store)* Clean up
- *(claude)* Apply skill authoring guidelines to existing skills
- *(store)* Simplify controller and state APIs (#352)
- *(store)* Simplify queue - remove task state tracking (#359)
- *(store)* Remove platform queue bindings (#360)
- *(store)* Simplify create store implementations (#361)
- *(store)* V2 (#362)
- *(store)* Merge getSnapshot/subscribe into attach (#364)
- *(store)* Rename feature to slice (#373)
- *(store)* Remove queue and task system (#382)
- *(core)* Centralize feature state types (#448)
- *(packages)* Replace disposer with abort controller (#449)
- *(store)* Replace signal/abort with signals namespace (#453)
- *(core)* Prefix media state exports with `Media` (#475)
- *(store)* Rename `Signals` to `AbortControllerRegistry` (#476)
- *(packages)* Simplify `createPlayer` type signatures (#477)
- *(packages)* Clean up UI component types and data flow (#479)
- *(packages)* Derive default props from core classes (#488)
- Replace URL.pathname with fileURLToPath for cross-platform … (#581)

### 📚 Documentation

- *(store)* Update readme
- *(plan)* Store bindings (#283)
- *(plan)* Remove old file
- *(plan)* Update store bindings
- *(claude)* Add symbol identification pattern
- *(plan)* Add using slices
- *(root)* Add AI-assisted development section to CONTRIBUTING
- *(claude)* Add no co-author trailer rule
- *(claude)* Compact old store plans
- *(plan)* Player api design (#300)
- *(plan)* Clean up player api design examples
- *(plan)* Add usage notes to player api design
- *(rfc)* Add rfc structure (#316)
- *(rfc)* Rename rfcs/ to rfc/
- *(rfc)* Primitives api & feature access (#307)
- *(claude)* Add `rfc` skill (#319)
- *(plan)* Update store reactive plan
- *(root)* Separate design from rfcs (#351)
- *(design)* Add feature slice design (#356)
- *(design)* Cross-reference feature-slice and feature-availability (#357)
- *(rfc)* Player api design v2 (#358)
- *(plan)* Store v2
- *(store)* Add feature API redesign plan
- *(claude)* Add player api plan
- *(rfc)* Update player api to match implementation (#375)
- *(rfc)* Use `createSelector` in player api examples
- *(claude)* Add Video.js component architecture patterns (#450)
- *(store)* Align README with current API (#451)
- *(design)* Add time component design (#454)
- *(site)* Update getting started code examples to match new api (#473)
- *(site)* Freshen up site README and CLAUDE
- *(design)* Controls (#456)
- *(design)* Slider (#506)
- Add captions decision (#611)
- *(design)* Add player-container separation decision (#614)

### ⚡ Performance

- *(store)* Optimize reactive state hot paths (#314)

### ⚙️ Miscellaneous Tasks

- Upgrade next to 16.0.10 (#216)
- *(github)* Enable blank commits
- *(root)* Prepare workspace for alpha (#276)
- *(packages)* Remove dom package
- *(packages)* Fix html and react deps
- *(root)* Fix tsconfig references
- Workspace improvements (#282)
- *(claude)* Add gh-issue and review-branch commands
- *(packages)* Remove `isolatedDeclarations` for store type inference support (#295)
- *(root)* Cache lint-staged eslint calls
- *(utils)* Fix broken badge
- *(site)* Add sentry to astro's server config (#299)
- *(ci)* Do not run on rfc/* branch
- *(claude)* Add skills system (#310)
- *(root)* Archive examples into tech-preview (#315)
- *(root)* Fix commitlint script
- *(ci)* Eslint + prettier → biome (#325)
- *(claude)* Add claude-update skill
- *(claude)* Migrate commands to skills
- *(claude)* Add /create-skill
- *(claude)* Add lit fundamentals
- *(site)* Move to netlify (#381)
- *(root)* Add postinstall symlinks for generic agents (#447)
- *(packages)* Add dev builds (#452)
- *(ci)* Format astro with biome
- *(ci)* Add .zed/settings.json
- *(packages)* Update tsdown to 0.20.3
- *(packages)* Resolve infinite dev rebuild loop in vite
- *(site)* Configure netlify build and turbo-ignore
- *(site)* Remove PostHog analytics (#510)
- *(ci)* Add bundle size reporting workflow (#511)
- *(ci)* Fix bundle size measurement and format report (#512)
- *(ci)* Remove forced minimum fill on bundle size bars
- *(ci)* Show delta in bundle size bars instead of absolute size
- *(ci)* Add turbo caching and replace size-limit (#524)
- *(site)* Audit and encode docs patterns (#535)
- *(ci)* Add missing label workflow deps
- *(root)* Add dependency graph to turbo dev and test tasks (#540)
- *(ci)* Update Biome to latest and autofix (#579)
- *(site)* Update Base UI from beta to stable release (#610)
- *(packages)* Bump to 10.0.0-alpha.0

## [@videojs/core@0.1.0-preview.10] - 2025-12-06

### 🚀 Features

- *(site)* Add blog to navigation
- *(site)* A few loading optimizations (#193)
- Add console banner (#186)
- Add tooltip core (#212)

### 🐛 Bug Fixes

- Add popover core, use in html and improve factory (#204)
- *(site)* Replace example mp4 with real
- Use popover core in react popover (#208)
- ToKebabCase import issue
- *(demo)* Upgrade next and react dependencies

### ⚙️ Miscellaneous Tasks

- *(root)* Update readme and contributing
- *(root)* Update contributing
- *(root)* Fix broken links in contributing
- *(root)* Clean up links in readme
- *(root)* Add community links to new issue page
- *(root)* Disable blank issues from new issue page
- *(ci)* Add action to label issues
- *(examples)* Remove `-demo` suffix on dir names

## [@videojs/core@0.1.0-preview.9] - 2025-11-18

### 🚀 Features

- *(site)* Llms.txt (#184)
- *(site)* Migrate blog, with canonicals to v8

### 🐛 Bug Fixes

- Anchor name in popover and tooltip (#194)
- Clean up core, less seams in wrappers (#197)
- Fix CLS due to popover attribute not SSR (#202)

### ⚙️ Miscellaneous Tasks

- *(site)* Add sitemap to robots.txt
- Workaround race condition build-styles.ts (#196)

## [@videojs/core@0.1.0-preview.8] - 2025-11-12

### 🐛 Bug Fixes

- *(site)* Idle load analytics (#188)
- Hydration mismatch in Tooltip and Popover (#190)

## [@videojs/core@0.1.0-preview.7] - 2025-11-11

### 🚀 Features

- Use anchor API for html elements (#174)
- *(react)* Use popover and anchor position API (#178)

### 🐛 Bug Fixes

- *(skins)* Slightly more idiomatic Tailwind, added custom properties (#175)
- *(react)* Dependency bug
- *(skins)* Remove vjs- prefixed CSS custom properties (#179)

### ⚙️ Miscellaneous Tasks

- *(site)* Begin v8 page migration (#177)
- *(site)* Update eject code generator

## [@videojs/core@0.1.0-preview.6] - 2025-11-06

### 🚀 Features

- *(site)* Restore docs sidebar state on navigation (#160)
- *(site)* Search (#165)
- *(react)* Use SimpleVideo as default Video and rename HLS version to HlsVideo (#171)

### 🐛 Bug Fixes

- *(site)* Correct style import for skins
- *(react, html)* Rename MediaProvider (and related) to VideoProvider (#159)
- *(site)* Update discord link (#170)

### 📚 Documentation

- Readme and contributing docs updates (#167)
- Cleanup issues with previous pass on readme and contributing (#168)
- More minor issue cleanup (#169)
- Update site/README and add site/CLAUDE (#172)

### ⚙️ Miscellaneous Tasks

- Consolidate eject examples (#162)
- Add templates for well defined issue and discussion types (#164)
- Discussion template naming convention (#166)
- *(site)* Add trademark notice to footer (#163)

## [@videojs/core@0.1.0-preview.5] - 2025-11-03

### 🚀 Features

- Eject examples (#149)
- *(site)* Remove unnecessary hydration workarounds
- *(site)* Add aside component
- *(site)* Restrict dev mode analytics
- *(site)* Prefetch links that require redirects
- *(site)* Prefetch all links
- *(site)* Film grain (#150)
- Update html tooltip API / use command attr (#151)

### 🐛 Bug Fixes

- *(site)* Scope HTML notice to HTML pages
- Connect html eject skins to media-provider
- *(site)* Update discord invite URL
- *(site)* Shrink Aside and Blockquote child margins
- Correct import on home page minimal skin
- *(site)* Adjust footer for safari and firefox
- *(site)* Improve legibility of aside
- *(site)* Improve header typography
- *(site)* Apply body background color
- *(site)* Tighten mobile framework selector
- *(site)* Stretch docs sidebar on desktop to prevent safari visual bug
- *(site)* Improve mobile home page spacing
- *(site)* Raise component demos above texture
- *(site)* More reliable tabs (#153)
- *(site)* Use MediaProvider on home page (#154)
- *(docs)* Fix repo links in CONTRIBUTING.md

### 📚 Documentation

- *(site)* Typo
- Specify npm dist tag (#155)

### ⚙️ Miscellaneous Tasks

- Update html demo to trigger build :(
- *(site)* Update discord link (#156)

### ◀️ Revert

- *(site)* Remove unnecessary hydration workarounds

## [@videojs/core@0.1.0-preview.4] - 2025-10-30

### 🚀 Features

- *(html)* Add element registrations

### 📚 Documentation

- Initial concepts and recipes (#147)
- *(site)* Update element imports

### ⚙️ Miscellaneous Tasks

- *(packages)* Move dom types down
- *(root)* Update architecture docs
- *(root)* Add timeline
- *(site)* Add dom lib types
- *(root)* Fix architecture link in readme
- *(root)* Add contributing.md
- *(root)* Update claude.md
- *(root)* Remove bbb.mp4

## [@videojs/core@0.1.0-preview.3] - 2025-10-29

### 🚀 Features

- *(ui)* Skin design improvements, add html frosted skin (WIP) (#133)
- *(skins)* Add html port of minimal skin (#140)
- *(website)* Update favicon and theme color based on dark mode
- *(site)* Raise prominence of home page demo toggles
- Idiomatic html markup, use popover API, add safe polygon utility (#143)
- *(site)* Tabs (#144)

### 🐛 Bug Fixes

- Add viewport meta element (#135)
- Add aspect-ratio to demos (#136)
- Remove `show-remaining` in HTML example (#137)
- *(packages)* Update version badges (#138)
- *(react)* Prevent dev build race condition (#139)
- *(website)* Improve legibility with heavier font weight (#141)
- Visually hidden focus guards (#142)
- Add aria-hidden to focus guards
- *(utils)* Remove unnecessary keyboard utils (#146)

### 📚 Documentation

- Initial component examples (#123)

### ⚙️ Miscellaneous Tasks

- *(root)* Ignore linting commits starting with wip
- *(website)* Hide blog
- *(website)* Update roadmap
- *(react)* Add postcss-prefix-selector types
- *(site)* Rename website to site
- Update repo URLs (#145)
- *(site)* Update privacy policy

## [@videojs/core@0.1.0-preview.2] - 2025-10-25

### 🐛 Bug Fixes

- *(root)* Remove dry-run from publish command
- *(core)* Update README to use v10 terminology

## [@videojs/core@0.1.0-preview.1] - 2025-10-25

### 🚀 Features

- Initialize Video.js 10 monorepo with core architecture
- *(monorepo)* Migrate prototype code to organized package structure
- Migrate entire monorepo from tsc to tsup for production builds
- Migrate examples from prototype and add CSS modules support
- *(react)* Enable automatic CSS injection for MediaSkinDefault component
- *(workspace)* Implement Turbo for build optimization and caching
- *(icons)* Implement shared SVG icon system across packages
- *(react-icons)* Implement SVGR-powered auto-generation with full styling support
- *(react-media-store)* Add shallowEqual utility for optimized state comparisons
- *(examples)* Configure separate default ports for React and HTML demos
- *(core)* Implement temporal state management for time-based media controls
- *(core,html,react)* Implement VolumeRange component with integrated state management
- *(media-store,html,react)* Implement TimeRange component with hook-style architecture
- *(icons)* Add fullscreen enter and exit icons
- *(media-store)* Add fullscreen state mediator with shadow DOM support
- *(media-store)* Add fullscreen button component state definition
- *(html)* Add fullscreen button component and icons
- *(react)* Add fullscreen button component
- *(html)* Integrate fullscreen button into control bar and improve container lifecycle
- *(react)* Add MediaContainer component for fullscreen functionality
- *(media-store)* Add comprehensive time formatting utilities
- *(media-store)* Add duration display component state definition
- *(html)* Implement duration display component
- *(react)* Implement duration display component
- *(skins)* Integrate duration display into default skins
- Implement current time display components
- Add showRemaining functionality to current time display
- Make time range compound component (#10)
- Add compound html timerange component (#14)
- *(ui)* Port over default skin
- *(ui)* Minor style tweaks
- Add volume range compound component (#19)
- Add core range, time and volume range (#23)
- Add range orientation to react components (#30)
- Add HTML vertical orientation to time and volume (#32)
- Add popover React component (#33)
- Add media-popover, cleanup html demo (#34)
- *(ui)* Add toasted skin
- *(ui)* Styling fixes for toasted skin (#38)
- Add React tooltip component (#35)
- Add HTML tooltip component (#40)
- Add transition status to React tooltip (#42)
- Rename range to slider (#46)
- *(ui)* Micro icons, toasted design tweaks (#52)
- *(ui)* More skin style tweaks (#53)
- Add a solution for React preview time display (#50)
- Add html preview time display (#58)
- Add tooltip transition status
- *(ui)* Skin and icon tweaks (#59)
- Add data style attributes to popover (#62)
- Website (#45)
- *(website)* Add posthog analytics (#71)
- *(website)* Favicon
- Add focus state to sliders and volume slider (#60)
- *(website)* Discord link
- *(website)* Social links in footer
- *(website)* Init dark mode
- Add keyboard control to sliders (#115)
- *(react)* Add Tailwind v4 compiled CSS for skins with vjs prefix (#114)
- Add display click to play / pause (#117)
- *(react)* Adding simple video (#125)
- *(ui)* Skin design tweaks (#126)

### 🐛 Bug Fixes

- *(config)* Remove duplicate noImplicitReturns key in tsconfig.base.json
- *(workspace)* Convert pnpm workspace protocol to npm workspace syntax
- Resolve TypeScript build errors across packages
- *(workspace)* Correct build:libs command to use explicit package names
- *(typescript)* Resolve declaration file generation for rollup packages (#1)
- Resolve package dependency and TypeScript export issues
- Resolve @open-wc/context-protocol module resolution issues
- Refactor private fields to public with underscore convention
- Clean up more typescript errors.
- *(media)* Use explicit exports to resolve React package TypeScript errors
- *(media-store)* Resolve TypeScript error in dispatch method
- *(react)* Implement proper HTML boolean data attributes for components
- *(media-store)* Resolve TypeScript declaration generation build issues
- *(media-store)* Replace tsup with rollup for consistent build tooling
- *(icons)* Add currentColor fill to fullscreen icons for proper theming
- *(time-display)* Clean up time utilities and simplify components
- Seek jump back to current time (#22)
- Add missing prettier plugin (remove later)
- Skin exports/imports
- *(ui)* Revert style testing change
- React version mismatch, add forward refs
- Rename attributes to kebab-case
- Enable eslint & run eslint:fix (#43)
- Design tweaks to toasted skin, lint rule tweaks (#44)
- Skin syntax usage cleanup (#48)
- *(ui)* Tone down text shadow on toasted skin (#54)
- Tooltip syntax error & remove restMs
- *(website)* More consistent marquee speed + loop
- *(website)* Align home page controls on mobile
- Minimal volume slider bug & fix dev infinite bug (#73)
- *(website)* Resolve Safari hydration error
- *(website)* Footer link highlight scoping
- *(website)* Mobile optimizations
- *(website)* Lighter text in dark mode
- *(website)* Turborepo cache vercel output (#118)
- *(root)* Add videojs keyword to package.json

### 💼 Other

- Refactor(html): implement hook-style component architecture for PlayButton and MuteButton
- Removing react-native. Aiming for 18.x react dependencies cross-workspace to avoid bugs. (#49)

### 🚜 Refactor

- Convert React Native packages to stubs and fix remaining build issues
- *(react)* Replace tsup with rollup for proper CSS modules support
- Migrate key packages from tsup to rollup for build consistency
- *(react)* Consolidate MuteButton components into unified implementation
- *(react)* Continue with component hooks rearchitecture.
- *(react)* Implement hooks-based PlayButton architecture
- *(react)* Create shared component factory for reusable architecture
- *(html)* Implement hook-style component architecture for PlayButton and MuteButton (gradual migration to more shareable with React).
- Standardize state property names across core, HTML, and React packages
- *(react)* Implement hook-style component architecture for PlayButton
- *(react,html)* Implement hook-style component architecture for MuteButton
- *(react,html)* Implement hook-style component architecture for MuteButton
- *(react,html)* Update PlayButton to use centralized state definitions
- *(core,react,html)* Migrate component state definitions to core media-store
- *(react)* Consolidate Video component into single module
- *(react)* Restructure VolumeRange to use render function pattern
- *(html)* Update VolumeRange to use handleEvent pattern for consistency
- *(media-store)* Replace mediaEvents with stateOwnersUpdateHandlers pattern
- *(media-store)* Add container state owner and rename event types
- *(html)* Remove temporary fullscreen test code from play button
- Move time formatting logic to platform components
- Rename formatDuration to formatDisplayTime
- Remove container radius from the skin

### 📚 Documentation

- Architecture docs (#51)
- Architecture docs v2 (#55)
- Readmes v0 (#72)

### 🎨 Styling

- *(react-demo)* Clean up code formatting and video source organization
- Add visual styling to time display components

### ⚙️ Miscellaneous Tasks

- Remove debug console.log statements and fix TypeScript declarations
- Add todo code comments.
- Add todo code comments.
- Remove range css from skins for now.
- Swapping out m3u8 example asset for react demo.
- Remove accidentally committed .playwright-mcp files
- Add .playwright-mcp to .gitignore
- Add prettier
- Npm -> pnpm
- New builds & types using tsdown (#20)
- Gitignore cleanup (#21)
- Add linting config
- Cleanup demo config (#28)
- Remove use-node-version, Vercel deployment
- Add generate:icons to build dependsOn
- Copy update to trigger a deploy (#39)
- Website tooling (#41)
- Consistent formatting (#47)
- Fix dup React versions
- Resolve alias during build (#56)
- `__dirname` not defined  (#57)
- Rename skins, minor style tweaks (#61)
- *(website)* Error and artifact cleanup
- Add CI build workflow
- Fix html-demo not importing skin (#127)
- *(root)* Add commitlint (#129)
- *(cd)* Add release-please workflow (#128)
- *(cd)* Add if statement to pnpm

