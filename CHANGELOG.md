# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🐛 Bug Fixes
- Improve whitespace around links (#913) by @decepulis in [#913](https://github.com/videojs/v10/pull/913)
- Fix Brightcove typo (#915) by @decepulis in [#915](https://github.com/videojs/v10/pull/915)
- Add root changelog generator

### ⚙️ Miscellaneous Tasks
- Add GH workflow for release PR's

## [@videojs/core@10.0.0-beta.5] - 2026-03-12

### 🐛 Bug Fixes
- Only set poster object-fit: contain in fullscreen (#906) by @sampotts in [#906](https://github.com/videojs/v10/pull/906)
- Include HLS CDN script in installation builder (#907) by @mihar-22 in [#907](https://github.com/videojs/v10/pull/907)
- Scope controls transitions to fine pointer only (#909) by @mihar-22 in [#909](https://github.com/videojs/v10/pull/909)
- Add @videojs/skins to release please (#910) by @sampotts in [#910](https://github.com/videojs/v10/pull/910)

## [@videojs/core@10.0.0-beta.4] - 2026-03-12

### 🚀 Features
- Stream segment fetches via ReadableStream body (#890) by @cjpillsbury in [#890](https://github.com/videojs/v10/pull/890)

### 🐛 Bug Fixes
- Work around video layout quirks in hero (#884) by @decepulis in [#884](https://github.com/videojs/v10/pull/884)
- Redirect trailing-slash URLs via edge function (#885) by @decepulis in [#885](https://github.com/videojs/v10/pull/885)
- Filter devOnly posts from RSS feed (#888) by @decepulis in [#888](https://github.com/videojs/v10/pull/888)
- Attaching media like elements and upgrade (#889) by @luwes in [#889](https://github.com/videojs/v10/pull/889)
- Standardize backdrop-filter and fix minimal root sizing (#895) by @sampotts in [#895](https://github.com/videojs/v10/pull/895)
- Replace GA4 with PostHog cookieless analytics (#894) by @decepulis in [#894](https://github.com/videojs/v10/pull/894)
- Mobile controls issues (#896) by @luwes in [#896](https://github.com/videojs/v10/pull/896)
- Add missing tooltip provider/group (#902) by @sampotts in [#902](https://github.com/videojs/v10/pull/902)
- Add playsinline to home and installation snippets (#897) by @mihar-22 in [#897](https://github.com/videojs/v10/pull/897)
- Skip delay when switching between grouped tooltips (#903) by @sampotts in [#903](https://github.com/videojs/v10/pull/903)
- Propagate byteRange when building segment load tasks (#904) by @cjpillsbury in [#904](https://github.com/videojs/v10/pull/904)
- Fix fullscreen video clipping and border-radius handling (#905) by @sampotts in [#905](https://github.com/videojs/v10/pull/905)

### ⚙️ Miscellaneous Tasks
- Use one root level changelog (#900) by @luwes in [#900](https://github.com/videojs/v10/pull/900)
- Fix changelog-path (#901) by @luwes in [#901](https://github.com/videojs/v10/pull/901)

## [@videojs/core@10.0.0-beta.3] - 2026-03-11

### 🚀 Features
- Add optional OG image support to blog posts (#878) by @decepulis in [#878](https://github.com/videojs/v10/pull/878)

### 🐛 Bug Fixes
- Remove commented error dialog blocks from video skins (#865) by @mihar-22 in [#865](https://github.com/videojs/v10/pull/865)
- Add missing slot="media" to HTML demo video elements (#867) by @decepulis in [#867](https://github.com/videojs/v10/pull/867)
- Netlify aliases -> redirects (#868) by @decepulis in [#868](https://github.com/videojs/v10/pull/868)
- Use custom domain for og:image on production deploys (#880) by @decepulis in [#880](https://github.com/videojs/v10/pull/880)
- Fix html container sizing (#881) by @sampotts in [#881](https://github.com/videojs/v10/pull/881)
- Resolve pip state against media target (#883) by @mihar-22 in [#883](https://github.com/videojs/v10/pull/883)
- Remove legacy caption markup artifacts (#882) by @mihar-22 in [#882](https://github.com/videojs/v10/pull/882)

### ⚙️ Miscellaneous Tasks
- Remove v8 link checker integration (#879) by @decepulis in [#879](https://github.com/videojs/v10/pull/879)
- Sandbox cleanup (#797) by @sampotts in [#797](https://github.com/videojs/v10/pull/797)

## [@videojs/core@10.0.0-beta.2] - 2026-03-10

### 🚀 Features
- Use HlsVideo in homepage HeroVideo component (#854) by @decepulis in [#854](https://github.com/videojs/v10/pull/854)
- Add CDN bundles and inline template minification (#827) by @mihar-22 in [#827](https://github.com/videojs/v10/pull/827)

### 🐛 Bug Fixes
- Update v10 blog post (#852) by @decepulis in [#852](https://github.com/videojs/v10/pull/852)
- Move legacy banner to base layout and fix mobile text size (#855) by @decepulis in [#855](https://github.com/videojs/v10/pull/855)
- Fix legacy banner layout on narrow viewports (#856) by @decepulis in [#856](https://github.com/videojs/v10/pull/856)
- Center-align radio option labels in ImageRadioGroup (#858) by @decepulis in [#858](https://github.com/videojs/v10/pull/858)

### 📚 Documentation
- Discord link in blog post (#863) by @heff in [#863](https://github.com/videojs/v10/pull/863)

### ⚙️ Miscellaneous Tasks
- Migrate to videojs.org and clean up remaining redirects (#853) by @decepulis in [#853](https://github.com/videojs/v10/pull/853)

## [@videojs/core@10.0.0-beta.1] - 2026-03-10

### 🚀 Features
- Ejected skins build script, docs page, and home page wiring (#809) by @sampotts in [#809](https://github.com/videojs/v10/pull/809)

### 🐛 Bug Fixes
- Update README contributing section for beta (#847) by @decepulis in [#847](https://github.com/videojs/v10/pull/847)
- Update package READMEs for beta (#848) by @decepulis in [#848](https://github.com/videojs/v10/pull/848)
- Set release-please manifest and package versions to beta.0 (#850) by @decepulis in [#850](https://github.com/videojs/v10/pull/850)

### ⚙️ Miscellaneous Tasks
- Transition from alpha/next to beta/latest (#846) by @decepulis in [#846](https://github.com/videojs/v10/pull/846)

## [@videojs/core@10.0.0-alpha.11] - 2026-03-10

### 🚀 Features
- Basic ManagedMediaSource support for Safari (#843) by @cjpillsbury in [#843](https://github.com/videojs/v10/pull/843)

### 🐛 Bug Fixes
- Correct homepage download comparison (#823) by @mihar-22 in [#823](https://github.com/videojs/v10/pull/823)
- Use MUX_URL const with UTM params for mux.com links (#833) by @decepulis in [#833](https://github.com/videojs/v10/pull/833)
- Prefer MediaSource over ManagedMediaSource (#838) by @cjpillsbury in [#838](https://github.com/videojs/v10/pull/838)
- Fix async teardown leaks and recreate engine on src change (#841) by @cjpillsbury in [#841](https://github.com/videojs/v10/pull/841)
- Add missing repository field (#844) by @decepulis in [#844](https://github.com/videojs/v10/pull/844)

### 💼 Other
- Add default Mux sources to home and installation snippets (#815) by @mihar-22 in [#815](https://github.com/videojs/v10/pull/815)
- Force release please, please (#829) by @cjpillsbury in [#829](https://github.com/videojs/v10/pull/829)

### 📚 Documentation
- Remove spread from videoFeatures examples (#816) by @mihar-22 in [#816](https://github.com/videojs/v10/pull/816)
- Remove TODO placeholders from installation copy (#820) by @mihar-22 in [#820](https://github.com/videojs/v10/pull/820)
- Move videojs CSS imports to top in React snippets (#818) by @mihar-22 in [#818](https://github.com/videojs/v10/pull/818)
- Add mux.com links in install/docs (#819) by @mihar-22 in [#819](https://github.com/videojs/v10/pull/819)
- Fix install tab label casing (#822) by @mihar-22 in [#822](https://github.com/videojs/v10/pull/822)
- Use framework exports in player API examples (#821) by @mihar-22 in [#821](https://github.com/videojs/v10/pull/821)
- Add 'use client' to React install example (#825) by @mihar-22 in [#825](https://github.com/videojs/v10/pull/825)
- Show HTML attribute name in API prop details (#817) by @mihar-22 in [#817](https://github.com/videojs/v10/pull/817)
- Use Audio/Video labels on installation page (#824) by @mihar-22 in [#824](https://github.com/videojs/v10/pull/824)
- V10 beta blog post (#811) by @heff in [#811](https://github.com/videojs/v10/pull/811)

## [@videojs/core@10.0.0-alpha.10] - 2026-03-10

### 🚀 Features
- New home page, docs, and design system (#566) by @ronalduQualabs in [#566](https://github.com/videojs/v10/pull/566)
- Add audio skins for HTML and React presets (#772) by @sampotts in [#772](https://github.com/videojs/v10/pull/772)
- Rebuild sandbox with shell UI and expanded templates (#773) by @sampotts in [#773](https://github.com/videojs/v10/pull/773)
- Darker dark mode footer (#780) by @decepulis in [#780](https://github.com/videojs/v10/pull/780)
- Dark mode support and template entry files (#781) by @sampotts in [#781](https://github.com/videojs/v10/pull/781)
- Add cookieless Google Analytics (#788) by @decepulis in [#788](https://github.com/videojs/v10/pull/788)
- Add legacy docs banner and v8 links (#786) by @decepulis in [#786](https://github.com/videojs/v10/pull/786)
- Initial push of SPF (#784) by @cjpillsbury in [#784](https://github.com/videojs/v10/pull/784)
- Port tooltip styling from tech preview (#800) by @sampotts in [#800](https://github.com/videojs/v10/pull/800)

### 🐛 Bug Fixes
- Stabilize bundle size diff reporting for UI components (#761) by @mihar-22 in [#761](https://github.com/videojs/v10/pull/761)
- Apply popover data attributes before showing via popover API (#763) by @mihar-22 in [#763](https://github.com/videojs/v10/pull/763)
- Update mux sponsor language and alignment (#768) by @decepulis in [#768](https://github.com/videojs/v10/pull/768)
- Redirect /guides to legacy.videojs.org (#694) by @decepulis in [#694](https://github.com/videojs/v10/pull/694)
- Rebrand polish (#775) by @decepulis in [#775](https://github.com/videojs/v10/pull/775)
- Prevent slider track click from closing popover (#776) by @mihar-22 in [#776](https://github.com/videojs/v10/pull/776)
- Thumb edge alignment jump (#766) by @mihar-22 in [#766](https://github.com/videojs/v10/pull/766)
- Handle remote image URLs in Img component (#789) by @decepulis in [#789](https://github.com/videojs/v10/pull/789)
- Use simpler web storage hook (#794) by @sampotts in [#794](https://github.com/videojs/v10/pull/794)
- Use Consent Mode v2 for cookieless Google Analytics (#795) by @decepulis in [#795](https://github.com/videojs/v10/pull/795)
- Optimistic current time update on seek to prevent slider snap-back (#799) by @mihar-22 in [#799](https://github.com/videojs/v10/pull/799)
- Allow exact tumblr image URL (#803) by @mihar-22 in [#803](https://github.com/videojs/v10/pull/803)
- Use composedPath for popover outside-click detection (#806) by @mihar-22 in [#806](https://github.com/videojs/v10/pull/806)
- Keep pointer position after pointerleave (#807) by @mihar-22 in [#807](https://github.com/videojs/v10/pull/807)

### 💼 Other
- Add spf to release please config (#796) by @cjpillsbury in [#796](https://github.com/videojs/v10/pull/796)

### 🚜 Refactor
- Replace document listeners with pointer capture in slider (#762) by @mihar-22 in [#762](https://github.com/videojs/v10/pull/762)

### 📚 Documentation
- Add captions button (#777) by @luwes in [#777](https://github.com/videojs/v10/pull/777)
- React API reference styling sections use correct selectors (#785) by @decepulis in [#785](https://github.com/videojs/v10/pull/785)

### ⚙️ Miscellaneous Tasks
- Update examples to have sidebar and more examples link on non (#767) by @luwes in [#767](https://github.com/videojs/v10/pull/767)
- Remove tech-preview package (#793) by @mihar-22 in [#793](https://github.com/videojs/v10/pull/793)
- Add hls-video to new sandbox setup (NOTE: hls-video H… (#798) by @cjpillsbury in [#798](https://github.com/videojs/v10/pull/798)
- Gitignore `.claude/settings.local.json` (#770) by @heff in [#770](https://github.com/videojs/v10/pull/770)
- Adding spf/simple-hls-video + filtering to only include CMAF/fmp4 sources (#802) by @cjpillsbury in [#802](https://github.com/videojs/v10/pull/802)
- Refactor tooltip/popover styles/classnames (#801) by @sampotts in [#801](https://github.com/videojs/v10/pull/801)
- Fix repo biome lint errors (#804) by @mihar-22 in [#804](https://github.com/videojs/v10/pull/804)

### New Contributors
* @ronalduQualabs made their first contribution in [#566](https://github.com/videojs/v10/pull/566)

## [@videojs/core@10.0.0-alpha.9] - 2026-03-06

### 🚀 Features
- Add subtitles handling + captions core (#692) by @luwes in [#692](https://github.com/videojs/v10/pull/692)
- Add alert dialog component (#739) by @mihar-22 in [#739](https://github.com/videojs/v10/pull/739)
- Add alert dialog element (#741) by @mihar-22 in [#741](https://github.com/videojs/v10/pull/741)
- Add alert dialog to video skin (#747) by @mihar-22 in [#747](https://github.com/videojs/v10/pull/747)

### 🐛 Bug Fixes
- Destroy hls.js instance on media unmount (#749) by @luwes in [#749](https://github.com/videojs/v10/pull/749)
- Rework bundle size report (#745) by @mihar-22 in [#745](https://github.com/videojs/v10/pull/745)
- Delegate not defining Delegate props (#751) by @luwes in [#751](https://github.com/videojs/v10/pull/751)
- Auto-unmute on volume change and restore volume on unmute (#752) by @mihar-22 in [#752](https://github.com/videojs/v10/pull/752)
- Add destroy (#748) by @mihar-22 in [#748](https://github.com/videojs/v10/pull/748)
- Derive effective mute state for volume UI components (#753) by @mihar-22 in [#753](https://github.com/videojs/v10/pull/753)
- Use double-RAF in transition open to enable entry animations (#755) by @mihar-22 in [#755](https://github.com/videojs/v10/pull/755)
- Ssr issue with hls.js (#758) by @luwes in [#758](https://github.com/videojs/v10/pull/758)
- TextTrackList and optimize (#760) by @luwes in [#760](https://github.com/videojs/v10/pull/760)

### ◀️ Revert
- Remove double raf hls destroy (#754) by @mihar-22 in [#754](https://github.com/videojs/v10/pull/754)

## [@videojs/core@10.0.0-alpha.8] - 2026-03-05

### 🚀 Features
- Small state and naming fixes  (#719) by @luwes in [#719](https://github.com/videojs/v10/pull/719)
- Add slider thumbnail element (#714) by @mihar-22 in [#714](https://github.com/videojs/v10/pull/714)
- Add slider thumbnail component (#722) by @mihar-22 in [#722](https://github.com/videojs/v10/pull/722)
- Add slider preview component (#710) by @mihar-22 in [#710](https://github.com/videojs/v10/pull/710)
- Add slider preview element (#733) by @mihar-22 in [#733](https://github.com/videojs/v10/pull/733)
- Add tooltip  (#734) by @mihar-22 in [#734](https://github.com/videojs/v10/pull/734)
- Add tooltip element (#735) by @mihar-22 in [#735](https://github.com/videojs/v10/pull/735)
- Add tooltip component (#736) by @mihar-22 in [#736](https://github.com/videojs/v10/pull/736)
- Add error feature (#713) by @mihar-22 in [#713](https://github.com/videojs/v10/pull/713)
- Add AlertDialog data attributes (#738) by @mihar-22 in [#738](https://github.com/videojs/v10/pull/738)
- Add alert dialog with dismiss layer and transitions (#743) by @mihar-22 in [#743](https://github.com/videojs/v10/pull/743)

### 🐛 Bug Fixes
- Set anchor-name and position-anchor imperatively in popover (#715) by @mihar-22 in [#715](https://github.com/videojs/v10/pull/715)
- Slider interaction and edge alignment broken (#721) by @mihar-22 in [#721](https://github.com/videojs/v10/pull/721)
- Add missing slot="media" to renderer element in HTML code block (#737) by @decepulis in [#737](https://github.com/videojs/v10/pull/737)
- Reuse diagnosis comment per PR instead of per run (#740) by @mihar-22 in [#740](https://github.com/videojs/v10/pull/740)
- Strict mode support (#742) by @mihar-22 in [#742](https://github.com/videojs/v10/pull/742)

### 📚 Documentation
- Add type module to cdn imports by @decepulis

## [@videojs/core@10.0.0-alpha.7] - 2026-03-04

### 🐛 Bug Fixes
- Move @videojs/skins to devDependencies (#716) by @decepulis in [#716](https://github.com/videojs/v10/pull/716)

## [@videojs/core@10.0.0-alpha.6] - 2026-03-04

### 🐛 Bug Fixes
- Reset installation guide to implemented features (#707) by @decepulis in [#707](https://github.com/videojs/v10/pull/707)
- Use camelCase attribute names in slider for react (#708) by @mihar-22 in [#708](https://github.com/videojs/v10/pull/708)
- Prevent shell injection from PR title/body in sync workflow (#711) by @decepulis in [#711](https://github.com/videojs/v10/pull/711)
- Move @videojs/icons to devDependencies (#712) by @decepulis in [#712](https://github.com/videojs/v10/pull/712)

## [@videojs/core@10.0.0-alpha.5] - 2026-03-04

### 🚀 Features
- Support native caption track shifting in video skins (#636) by @sampotts in [#636](https://github.com/videojs/v10/pull/636)
- Add playback rate button component (#639) by @sampotts in [#639](https://github.com/videojs/v10/pull/639)
- Add PlaybackRateButton to core, html, and react (#642) by @decepulis in [#642](https://github.com/videojs/v10/pull/642)
- Add thumbnail component and text track store feature (#643) by @mihar-22 in [#643](https://github.com/videojs/v10/pull/643)
- Add thumbnail element (#646) by @mihar-22 in [#646](https://github.com/videojs/v10/pull/646)
- Add thumbnail component (#648) by @mihar-22 in [#648](https://github.com/videojs/v10/pull/648)
- Add popover component (#615) by @mihar-22 in [#615](https://github.com/videojs/v10/pull/615)
- Add popover element (#652) by @mihar-22 in [#652](https://github.com/videojs/v10/pull/652)
- Add popover component (#653) by @mihar-22 in [#653](https://github.com/videojs/v10/pull/653)
- Add slider component (#644) by @mihar-22 in [#644](https://github.com/videojs/v10/pull/644)
- Add time slider component (#647) by @mihar-22 in [#647](https://github.com/videojs/v10/pull/647)
- Add slider element (#655) by @mihar-22 in [#655](https://github.com/videojs/v10/pull/655)
- Add time slider element (#656) by @mihar-22 in [#656](https://github.com/videojs/v10/pull/656)
- Add volume slider element (#657) by @mihar-22 in [#657](https://github.com/videojs/v10/pull/657)
- Port time slider styling into video skin presets (#666) by @sampotts in [#666](https://github.com/videojs/v10/pull/666)
- Port volume popover and slider styling into skin presets (#667) by @sampotts in [#667](https://github.com/videojs/v10/pull/667)
- Orientation-aware buffer styling and slider improvements (#671) by @sampotts in [#671](https://github.com/videojs/v10/pull/671)
- Add README and sync script (#673) by @sampotts in [#673](https://github.com/videojs/v10/pull/673)
- Add weekly project report workflow (#665) by @mihar-22 in [#665](https://github.com/videojs/v10/pull/665)
- Add issue-to-pr claude workflow (#675) by @mihar-22 in [#675](https://github.com/videojs/v10/pull/675)
- Add api-reference sync agent workflow (#676) by @mihar-22 in [#676](https://github.com/videojs/v10/pull/676)
- Split llms.txt into per-framework and blog sub-indexes (#697) by @decepulis in [#697](https://github.com/videojs/v10/pull/697)
- Add TimeSlider, VolumeSlider, Popover API references (#685) by @decepulis in [#685](https://github.com/videojs/v10/pull/685)
- Implement default and minimal skins for HTML player (#698) by @sampotts in [#698](https://github.com/videojs/v10/pull/698)
- Replace home page tech preview player with real player (#580) by @decepulis in [#580](https://github.com/videojs/v10/pull/580)

### 🐛 Bug Fixes
- Temporarily hide the caption button (#629) by @sampotts in [#629](https://github.com/videojs/v10/pull/629)
- Revert preset provider (#631) by @luwes in [#631](https://github.com/videojs/v10/pull/631)
- Add SSR stubs for HLS media (#641) by @luwes in [#641](https://github.com/videojs/v10/pull/641)
- Allow OIDC token in issue sync workflow (#661) by @mihar-22 in [#661](https://github.com/videojs/v10/pull/661)
- Reduce issue sync permission denials (#662) by @mihar-22 in [#662](https://github.com/videojs/v10/pull/662)
- Use relative import path for useForceRender (#669) by @sampotts in [#669](https://github.com/videojs/v10/pull/669)
- Correct buffer selector names in minimal skin CSS (#672) by @sampotts in [#672](https://github.com/videojs/v10/pull/672)
- Strip script and style tags from llms markdown output (#678) by @decepulis in [#678](https://github.com/videojs/v10/pull/678)
- Review cleanup for API reference pages (#685) by @decepulis
- Prevent tsdown from stripping custom element registrations (#703) by @mihar-22 in [#703](https://github.com/videojs/v10/pull/703)
- Skip error pages and strip styles in llms-markdown integration (#706) by @decepulis in [#706](https://github.com/videojs/v10/pull/706)

### 🚜 Refactor
- Separate provider and container concerns in createPlayer (#635) by @mihar-22 in [#635](https://github.com/videojs/v10/pull/635)
- Move feature presets to subpath exports (#633) by @mihar-22 in [#633](https://github.com/videojs/v10/pull/633)
- Split UI define modules and narrow slider imports (#659) by @mihar-22 in [#659](https://github.com/videojs/v10/pull/659)
- Dry up core, html, and react UI architecture (#699) by @mihar-22 in [#699](https://github.com/videojs/v10/pull/699)
- Split api-reference sync into three focused jobs (#677) by @decepulis in [#677](https://github.com/videojs/v10/pull/677)

### 📚 Documentation
- PlaybackRateButton component spec (#624) by @decepulis in [#624](https://github.com/videojs/v10/pull/624)
- Use createPlayer in React installation code generator (#634) by @mihar-22 in [#634](https://github.com/videojs/v10/pull/634)
- Add thumbnail reference page  (#654) by @mihar-22 in [#654](https://github.com/videojs/v10/pull/654)
- Update timeline dates for alpha and beta by @mihar-22

### ⚙️ Miscellaneous Tasks
- Add issue sync workflow (#660) by @mihar-22 in [#660](https://github.com/videojs/v10/pull/660)
- Migrate issue triage workflow to Claude agent (#663) by @mihar-22 in [#663](https://github.com/videojs/v10/pull/663)
- Add explicit checks and Claude diagnosis (#664) by @mihar-22 in [#664](https://github.com/videojs/v10/pull/664)
- Remove weekly project report workflow (#680) by @mihar-22 in [#680](https://github.com/videojs/v10/pull/680)
- Add session start hook to run gh-setup-hooks (#700) by @mihar-22 in [#700](https://github.com/videojs/v10/pull/700)

## [@videojs/core@10.0.0-alpha.4] - 2026-02-26

### 🚀 Features
- Add background video preset (#607) by @luwes in [#607](https://github.com/videojs/v10/pull/607)

### 🐛 Bug Fixes
- Move @videojs/icons to devDependencies by @decepulis
- Update lockfile for icons dependency move by @decepulis

## [@videojs/core@10.0.0-alpha.3] - 2026-02-26

### 🐛 Bug Fixes
- Add repository field to all packages for provenance verification by @decepulis

## [@videojs/core@10.0.0-alpha.2] - 2026-02-26

### 🚀 Features
- Switch to npm trusted publishers by @decepulis

## [@videojs/core@10.0.0-alpha.1] - 2026-02-26

### 🚀 Features
- Improvements to react examples (#210) by @sampotts in [#210](https://github.com/videojs/v10/pull/210)
- Add user activity logic (#278) by @sampotts in [#278](https://github.com/videojs/v10/pull/278)
- Initial release (#279) by @mihar-22 in [#279](https://github.com/videojs/v10/pull/279)
- Add error codes (#284) by @mihar-22 in [#284](https://github.com/videojs/v10/pull/284)
- Queue task refactor (#287) by @mihar-22 in [#287](https://github.com/videojs/v10/pull/287)
- React bindings (#288) by @mihar-22 in [#288](https://github.com/videojs/v10/pull/288)
- Dom media slices (#292) by @mihar-22 in [#292](https://github.com/videojs/v10/pull/292)
- Lit bindings (#289) by @mihar-22 in [#289](https://github.com/videojs/v10/pull/289)
- Add video component and utility hooks (#293) by @mihar-22 in [#293](https://github.com/videojs/v10/pull/293)
- UseMutation hook for react (#290) by @mihar-22 in [#290](https://github.com/videojs/v10/pull/290)
- UseOptimistic hook for react (#291) by @mihar-22 in [#291](https://github.com/videojs/v10/pull/291)
- Lit bound controllers (#297) by @mihar-22 in [#297](https://github.com/videojs/v10/pull/297)
- Skin store setup (#298) by @mihar-22 in [#298](https://github.com/videojs/v10/pull/298)
- Sync queue (#308) by @mihar-22 in [#308](https://github.com/videojs/v10/pull/308)
- Add reactive state primitives (#311) by @mihar-22 in [#311](https://github.com/videojs/v10/pull/311)
- Align queue with native (#312) by @mihar-22 in [#312](https://github.com/videojs/v10/pull/312)
- Store selector api (#370) by @mihar-22 in [#370](https://github.com/videojs/v10/pull/370)
- Add player target and feature selectors (#371) by @mihar-22 in [#371](https://github.com/videojs/v10/pull/371)
- Setup react player api (#372) by @mihar-22 in [#372](https://github.com/videojs/v10/pull/372)
- Setup player api (#374) by @mihar-22 in [#374](https://github.com/videojs/v10/pull/374)
- Add `PlayerElement` to `createPlayer` (#376) by @mihar-22 in [#376](https://github.com/videojs/v10/pull/376)
- Remove style from urls (#378) by @decepulis in [#378](https://github.com/videojs/v10/pull/378)
- Add interactive getting started guide (#280) by @daniel-hayes in [#280](https://github.com/videojs/v10/pull/280)
- Add play button component (#383) by @mihar-22 in [#383](https://github.com/videojs/v10/pull/383)
- Add mute button component (#455) by @mihar-22 in [#455](https://github.com/videojs/v10/pull/455)
- Extract api reference from components (#464) by @decepulis in [#464](https://github.com/videojs/v10/pull/464)
- Add presentation feature (#458) by @mihar-22 in [#458](https://github.com/videojs/v10/pull/458)
- Add time display component (#460) by @mihar-22 in [#460](https://github.com/videojs/v10/pull/460)
- Add fullscreen button component (#459) by @mihar-22 in [#459](https://github.com/videojs/v10/pull/459)
- Generated multipart component api reference (#468) by @decepulis in [#468](https://github.com/videojs/v10/pull/468)
- Add private sandbox package for internal testing (#478) by @mihar-22 in [#478](https://github.com/videojs/v10/pull/478)
- Reorganize import paths by use case (#480) by @mihar-22 in [#480](https://github.com/videojs/v10/pull/480)
- Perform /docs redirect client-side by @decepulis
- Simple api reference examples (#472) by @decepulis in [#472](https://github.com/videojs/v10/pull/472)
- Add display font by @decepulis
- Add poster component (#457) by @mihar-22 in [#457](https://github.com/videojs/v10/pull/457)
- Add lightweight reactive element base (#513) by @mihar-22 in [#513](https://github.com/videojs/v10/pull/513)
- Add controls component with activity tracking (#514) by @mihar-22 in [#514](https://github.com/videojs/v10/pull/514)
- Basic 404 and 500 pages by @decepulis
- Controls API reference by @decepulis
- Poster API reference by @decepulis
- Clean up api reference header hierarchy by @decepulis
- Add pip button component (#525) by @mihar-22 in [#525](https://github.com/videojs/v10/pull/525)
- Add seek button component (#526) by @mihar-22 in [#526](https://github.com/videojs/v10/pull/526)
- Add buffering indicator component (#527) by @mihar-22 in [#527](https://github.com/videojs/v10/pull/527)
- State subscription primitives (#528) by @mihar-22 in [#528](https://github.com/videojs/v10/pull/528)
- Add slider core layer (#529) by @mihar-22 in [#529](https://github.com/videojs/v10/pull/529)
- Add pip button api reference by @decepulis
- Add seek button api reference by @decepulis
- Add buffering indicator api reference by @decepulis
- Initial skin scaffolding (#523) by @sampotts in [#523](https://github.com/videojs/v10/pull/523)
- Setup icons package (#536) by @sampotts in [#536](https://github.com/videojs/v10/pull/536)
- Add Mux health check action (#542) by @decepulis in [#542](https://github.com/videojs/v10/pull/542)
- Framework-specific SEO metadata for docs (#541) by @decepulis in [#541](https://github.com/videojs/v10/pull/541)
- Add media API + HLS video components (#507) by @luwes in [#507](https://github.com/videojs/v10/pull/507)
- Implement default and minimal video skins (#550) by @sampotts in [#550](https://github.com/videojs/v10/pull/550)
- Implement video skins with responsive layout (#568) by @sampotts in [#568](https://github.com/videojs/v10/pull/568)
- Add markdown content negotiation via Netlify edge function (#573) by @decepulis in [#573](https://github.com/videojs/v10/pull/573)
- Add captions styling to video skins (#582) by @sampotts in [#582](https://github.com/videojs/v10/pull/582)
- Add background video components (#567) by @luwes in [#567](https://github.com/videojs/v10/pull/567)
- Add Tailwind ejected video skins (#589) by @sampotts in [#589](https://github.com/videojs/v10/pull/589)
- Add media delegate mixin (#598) by @luwes in [#598](https://github.com/videojs/v10/pull/598)
- Add util reference pipeline (#537) by @decepulis in [#537](https://github.com/videojs/v10/pull/537)
- Add error dialogs (#603) by @sampotts in [#603](https://github.com/videojs/v10/pull/603)
- Preserve scroll position on framework switch (pagereveal) (#608) by @decepulis in [#608](https://github.com/videojs/v10/pull/608)
- Add captions button to video skins (#612) by @sampotts in [#612](https://github.com/videojs/v10/pull/612)
- Add slider dom (#613) by @mihar-22 in [#613](https://github.com/videojs/v10/pull/613)
- Source URL auto-detection for installation page (#619) by @decepulis in [#619](https://github.com/videojs/v10/pull/619)

### 🐛 Bug Fixes
- Fixed fullscreen on ios safari (#211) by @LachlanRumery in [#211](https://github.com/videojs/v10/pull/211)
- Fix routing on vercel (#217) by @sampotts in [#217](https://github.com/videojs/v10/pull/217)
- Fix CSS consistency issues (#309) by @sampotts in [#309](https://github.com/videojs/v10/pull/309)
- Guard abort on request supersession (#313) by @mihar-22 in [#313](https://github.com/videojs/v10/pull/313)
- Style overflowing tables by @decepulis
- Update npm install paths (#379) by @decepulis in [#379](https://github.com/videojs/v10/pull/379)
- Apply dark mode to code blocks by @decepulis
- Correct table overscroll indicator color in dark mode by @decepulis
- Updating installation langauge by @heff
- Add audio to getting started guide and other updates by @heff
- Work around false-positive biome / astro errors by @decepulis
- Enable unbundle mode to avoid mangled exports by @mihar-22
- Discover media elements and attach store target via DOM (#481) by @mihar-22 in [#481](https://github.com/videojs/v10/pull/481)
- Improve initial demo css by @decepulis
- Improve time demo css by @decepulis
- Don't hit archive.org during build by @decepulis
- Show docs sidebar on tablet by @decepulis
- Clarify "Copy as Markdown" button by @decepulis
- Support satisfies in api-docs data attrs extraction (#517) by @decepulis in [#517](https://github.com/videojs/v10/pull/517)
- Resolve aliased part descriptions in api docs (#518) by @decepulis in [#518](https://github.com/videojs/v10/pull/518)
- Use first-match-wins for multipart primary selection (#519) by @decepulis in [#519](https://github.com/videojs/v10/pull/519)
- Strip trailing slashes from pathname when copying markdown by @decepulis
- Fix website tests workflow (#565) by @decepulis in [#565](https://github.com/videojs/v10/pull/565)
- Fix circular import and simplify media types (#569) by @sampotts in [#569](https://github.com/videojs/v10/pull/569)
- Use astro:env for server-only environment variables (#574) by @decepulis in [#574](https://github.com/videojs/v10/pull/574)
- Use cross-platform Node script for postinstall symlinks (#577) by @decepulis in [#577](https://github.com/videojs/v10/pull/577)
- Use namespace imports for actions packages (#583) by @sampotts in [#583](https://github.com/videojs/v10/pull/583)
- Improve auth popup size and clean up Mux links (#587) by @decepulis in [#587](https://github.com/videojs/v10/pull/587)
- Upgrade to React 19 to resolve invalid hook call (#597) by @decepulis in [#597](https://github.com/videojs/v10/pull/597)
- Work around Astro SSR false "Invalid hook call" warnings (#600) by @decepulis in [#600](https://github.com/videojs/v10/pull/600)
- Update style path in index.html (#604) by @sampotts in [#604](https://github.com/videojs/v10/pull/604)
- Add missing background-video media element import (#605) by @decepulis in [#605](https://github.com/videojs/v10/pull/605)
- Disable Netlify edge functions in dev to prevent Deno OOM (#620) by @decepulis in [#620](https://github.com/videojs/v10/pull/620)
- Resolve biome lint warnings (#602) by @decepulis in [#602](https://github.com/videojs/v10/pull/602)
- Preserve user props in time slider (#621) by @mihar-22 in [#621](https://github.com/videojs/v10/pull/621)

### 🚜 Refactor
- Remove partial slice state updates (#296) by @mihar-22 in [#296](https://github.com/videojs/v10/pull/296)
- Queue simplification (#302) by @mihar-22 in [#302](https://github.com/videojs/v10/pull/302)
- Rename slice to feature (#318) by @mihar-22 in [#318](https://github.com/videojs/v10/pull/318)
- Simplify state management + computeds (#321) by @mihar-22 in [#321](https://github.com/videojs/v10/pull/321)
- Use undefined instead of null for void-input placeholder (#322) by @mihar-22 in [#322](https://github.com/videojs/v10/pull/322)
- Flatten store/queue state (#326) by @mihar-22 in [#326](https://github.com/videojs/v10/pull/326)
- Clean up by @mihar-22
- Apply skill authoring guidelines to existing skills by @mihar-22
- Simplify controller and state APIs (#352) by @mihar-22 in [#352](https://github.com/videojs/v10/pull/352)
- Simplify queue - remove task state tracking (#359) by @mihar-22 in [#359](https://github.com/videojs/v10/pull/359)
- Remove platform queue bindings (#360) by @mihar-22 in [#360](https://github.com/videojs/v10/pull/360)
- Simplify create store implementations (#361) by @mihar-22 in [#361](https://github.com/videojs/v10/pull/361)
- V2 (#362) by @mihar-22 in [#362](https://github.com/videojs/v10/pull/362)
- Merge getSnapshot/subscribe into attach (#364) by @mihar-22 in [#364](https://github.com/videojs/v10/pull/364)
- Rename feature to slice (#373) by @mihar-22 in [#373](https://github.com/videojs/v10/pull/373)
- Remove queue and task system (#382) by @mihar-22 in [#382](https://github.com/videojs/v10/pull/382)
- Centralize feature state types (#448) by @mihar-22 in [#448](https://github.com/videojs/v10/pull/448)
- Replace disposer with abort controller (#449) by @mihar-22 in [#449](https://github.com/videojs/v10/pull/449)
- Replace signal/abort with signals namespace (#453) by @mihar-22 in [#453](https://github.com/videojs/v10/pull/453)
- Prefix media state exports with `Media` (#475) by @mihar-22 in [#475](https://github.com/videojs/v10/pull/475)
- Rename `Signals` to `AbortControllerRegistry` (#476) by @mihar-22 in [#476](https://github.com/videojs/v10/pull/476)
- Simplify `createPlayer` type signatures (#477) by @mihar-22 in [#477](https://github.com/videojs/v10/pull/477)
- Clean up UI component types and data flow (#479) by @mihar-22 in [#479](https://github.com/videojs/v10/pull/479)
- Derive default props from core classes (#488) by @mihar-22 in [#488](https://github.com/videojs/v10/pull/488)
- Replace URL.pathname with fileURLToPath for cross-platform … (#581) by @dh-mux in [#581](https://github.com/videojs/v10/pull/581)

### 📚 Documentation
- Update readme by @mihar-22
- Store bindings (#283) by @mihar-22 in [#283](https://github.com/videojs/v10/pull/283)
- Remove old file by @mihar-22
- Update store bindings by @mihar-22
- Add symbol identification pattern by @mihar-22
- Add using slices by @mihar-22
- Add AI-assisted development section to CONTRIBUTING by @mihar-22
- Add no co-author trailer rule by @mihar-22
- Compact old store plans by @mihar-22
- Player api design (#300) by @mihar-22 in [#300](https://github.com/videojs/v10/pull/300)
- Clean up player api design examples by @mihar-22
- Add usage notes to player api design by @mihar-22
- Add rfc structure (#316) by @mihar-22 in [#316](https://github.com/videojs/v10/pull/316)
- Rename rfcs/ to rfc/ by @mihar-22
- Primitives api & feature access (#307) by @mihar-22
- Add `rfc` skill (#319) by @mihar-22
- Update store reactive plan by @mihar-22
- Separate design from rfcs (#351) by @mihar-22 in [#351](https://github.com/videojs/v10/pull/351)
- Add feature slice design (#356) by @mihar-22 in [#356](https://github.com/videojs/v10/pull/356)
- Cross-reference feature-slice and feature-availability (#357) by @mihar-22 in [#357](https://github.com/videojs/v10/pull/357)
- Player api design v2 (#358) by @mihar-22 in [#358](https://github.com/videojs/v10/pull/358)
- Store v2 by @mihar-22
- Add feature API redesign plan by @mihar-22
- Add player api plan by @mihar-22
- Update player api to match implementation (#375) by @mihar-22 in [#375](https://github.com/videojs/v10/pull/375)
- Use `createSelector` in player api examples by @mihar-22
- Add Video.js component architecture patterns (#450) by @mihar-22 in [#450](https://github.com/videojs/v10/pull/450)
- Align README with current API (#451) by @mihar-22 in [#451](https://github.com/videojs/v10/pull/451)
- Add time component design (#454) by @mihar-22 in [#454](https://github.com/videojs/v10/pull/454)
- Update getting started code examples to match new api (#473) by @heff in [#473](https://github.com/videojs/v10/pull/473)
- Freshen up site README and CLAUDE by @decepulis
- Controls (#456) by @mihar-22 in [#456](https://github.com/videojs/v10/pull/456)
- Slider (#506) by @mihar-22 in [#506](https://github.com/videojs/v10/pull/506)
- Add captions decision (#611) by @sampotts in [#611](https://github.com/videojs/v10/pull/611)
- Add player-container separation decision (#614) by @heff in [#614](https://github.com/videojs/v10/pull/614)

### ⚡ Performance
- Optimize reactive state hot paths (#314) by @mihar-22 in [#314](https://github.com/videojs/v10/pull/314)

### ⚙️ Miscellaneous Tasks
- Upgrade next to 16.0.10 (#216) by @luwes in [#216](https://github.com/videojs/v10/pull/216)
- Enable blank commits by @mihar-22
- Prepare workspace for alpha (#276) by @mihar-22 in [#276](https://github.com/videojs/v10/pull/276)
- Remove dom package by @mihar-22
- Fix html and react deps by @mihar-22
- Fix tsconfig references by @mihar-22
- Workspace improvements (#282) by @mihar-22 in [#282](https://github.com/videojs/v10/pull/282)
- Add gh-issue and review-branch commands by @mihar-22
- Remove `isolatedDeclarations` for store type inference support (#295) by @mihar-22 in [#295](https://github.com/videojs/v10/pull/295)
- Cache lint-staged eslint calls by @mihar-22
- Fix broken badge by @mihar-22
- Add sentry to astro's server config (#299) by @daniel-hayes in [#299](https://github.com/videojs/v10/pull/299)
- Do not run on rfc/* branch by @mihar-22
- Add skills system (#310) by @mihar-22 in [#310](https://github.com/videojs/v10/pull/310)
- Archive examples into tech-preview (#315) by @mihar-22 in [#315](https://github.com/videojs/v10/pull/315)
- Fix commitlint script by @mihar-22
- Eslint + prettier → biome (#325) by @sampotts in [#325](https://github.com/videojs/v10/pull/325)
- Add claude-update skill by @mihar-22
- Migrate commands to skills by @mihar-22
- Add /create-skill by @mihar-22
- Add lit fundamentals by @mihar-22
- Move to netlify (#381) by @decepulis in [#381](https://github.com/videojs/v10/pull/381)
- Add postinstall symlinks for generic agents (#447) by @mihar-22 in [#447](https://github.com/videojs/v10/pull/447)
- Add dev builds (#452) by @mihar-22 in [#452](https://github.com/videojs/v10/pull/452)
- Format astro with biome by @decepulis
- Add .zed/settings.json by @decepulis
- Update tsdown to 0.20.3 by @mihar-22
- Resolve infinite dev rebuild loop in vite by @mihar-22
- Configure netlify build and turbo-ignore by @decepulis
- Remove PostHog analytics (#510) by @decepulis in [#510](https://github.com/videojs/v10/pull/510)
- Add bundle size reporting workflow (#511) by @mihar-22 in [#511](https://github.com/videojs/v10/pull/511)
- Fix bundle size measurement and format report (#512) by @mihar-22 in [#512](https://github.com/videojs/v10/pull/512)
- Remove forced minimum fill on bundle size bars by @mihar-22
- Show delta in bundle size bars instead of absolute size by @mihar-22
- Add turbo caching and replace size-limit (#524) by @mihar-22 in [#524](https://github.com/videojs/v10/pull/524)
- Audit and encode docs patterns (#535) by @decepulis in [#535](https://github.com/videojs/v10/pull/535)
- Add missing label workflow deps by @mihar-22
- Add dependency graph to turbo dev and test tasks (#540) by @decepulis in [#540](https://github.com/videojs/v10/pull/540)
- Update Biome to latest and autofix (#579) by @sampotts in [#579](https://github.com/videojs/v10/pull/579)
- Update Base UI from beta to stable release (#610) by @decepulis in [#610](https://github.com/videojs/v10/pull/610)
- Bump to 10.0.0-alpha.0 by @decepulis

### New Contributors
* @dh-mux made their first contribution in [#581](https://github.com/videojs/v10/pull/581)
* @daniel-hayes made their first contribution in [#280](https://github.com/videojs/v10/pull/280)
* @LachlanRumery made their first contribution in [#211](https://github.com/videojs/v10/pull/211)

## [@videojs/core@0.1.0-preview.10] - 2025-12-06

### 🚀 Features
- Add blog to navigation by @decepulis
- A few loading optimizations (#193) by @decepulis in [#193](https://github.com/videojs/v10/pull/193)
- Add console banner (#186) by @luwes in [#186](https://github.com/videojs/v10/pull/186)
- Add tooltip core (#212) by @luwes in [#212](https://github.com/videojs/v10/pull/212)

### 🐛 Bug Fixes
- Add popover core, use in html and improve factory (#204) by @luwes in [#204](https://github.com/videojs/v10/pull/204)
- Replace example mp4 with real by @mihar-22
- Use popover core in react popover (#208) by @luwes in [#208](https://github.com/videojs/v10/pull/208)
- ToKebabCase import issue by @luwes
- Upgrade next and react dependencies by @luwes

### ⚙️ Miscellaneous Tasks
- Update readme and contributing by @mihar-22
- Update contributing by @mihar-22
- Fix broken links in contributing by @mihar-22
- Clean up links in readme by @mihar-22
- Add community links to new issue page by @mihar-22
- Disable blank issues from new issue page by @mihar-22
- Add action to label issues by @mihar-22
- Remove `-demo` suffix on dir names by @mihar-22

## [@videojs/core@0.1.0-preview.9] - 2025-11-18

### 🚀 Features
- Llms.txt (#184) by @decepulis in [#184](https://github.com/videojs/v10/pull/184)
- Migrate blog, with canonicals to v8 by @decepulis

### 🐛 Bug Fixes
- Anchor name in popover and tooltip (#194) by @luwes in [#194](https://github.com/videojs/v10/pull/194)
- Clean up core, less seams in wrappers (#197) by @luwes in [#197](https://github.com/videojs/v10/pull/197)
- Fix CLS due to popover attribute not SSR (#202) by @luwes in [#202](https://github.com/videojs/v10/pull/202)

### ⚙️ Miscellaneous Tasks
- Add sitemap to robots.txt by @decepulis
- Workaround race condition build-styles.ts (#196) by @luwes in [#196](https://github.com/videojs/v10/pull/196)

## [@videojs/core@0.1.0-preview.8] - 2025-11-12

### 🐛 Bug Fixes
- Idle load analytics (#188) by @decepulis in [#188](https://github.com/videojs/v10/pull/188)
- Hydration mismatch in Tooltip and Popover (#190) by @luwes in [#190](https://github.com/videojs/v10/pull/190)

## [@videojs/core@0.1.0-preview.7] - 2025-11-11

### 🚀 Features
- Use anchor API for html elements (#174) by @luwes in [#174](https://github.com/videojs/v10/pull/174)
- Use popover and anchor position API (#178) by @luwes in [#178](https://github.com/videojs/v10/pull/178)

### 🐛 Bug Fixes
- Slightly more idiomatic Tailwind, added custom properties (#175) by @sampotts in [#175](https://github.com/videojs/v10/pull/175)
- Dependency bug by @luwes
- Remove vjs- prefixed CSS custom properties (#179) by @sampotts in [#179](https://github.com/videojs/v10/pull/179)

### ⚙️ Miscellaneous Tasks
- Begin v8 page migration (#177) by @decepulis in [#177](https://github.com/videojs/v10/pull/177)
- Update eject code generator by @luwes

## [@videojs/core@0.1.0-preview.6] - 2025-11-06

### 🚀 Features
- Restore docs sidebar state on navigation (#160) by @decepulis in [#160](https://github.com/videojs/v10/pull/160)
- Search (#165) by @decepulis in [#165](https://github.com/videojs/v10/pull/165)
- Use SimpleVideo as default Video and rename HLS version to HlsVideo (#171) by @cjpillsbury in [#171](https://github.com/videojs/v10/pull/171)

### 🐛 Bug Fixes
- Correct style import for skins by @decepulis
- Rename MediaProvider (and related) to VideoProvider (#159) by @cjpillsbury in [#159](https://github.com/videojs/v10/pull/159)
- Update discord link (#170) by @heff in [#170](https://github.com/videojs/v10/pull/170)

### 📚 Documentation
- Readme and contributing docs updates (#167) by @cjpillsbury in [#167](https://github.com/videojs/v10/pull/167)
- Cleanup issues with previous pass on readme and contributing (#168) by @cjpillsbury in [#168](https://github.com/videojs/v10/pull/168)
- More minor issue cleanup (#169) by @cjpillsbury in [#169](https://github.com/videojs/v10/pull/169)
- Update site/README and add site/CLAUDE (#172) by @decepulis in [#172](https://github.com/videojs/v10/pull/172)

### ⚙️ Miscellaneous Tasks
- Consolidate eject examples (#162) by @decepulis in [#162](https://github.com/videojs/v10/pull/162)
- Add templates for well defined issue and discussion types (#164) by @cjpillsbury in [#164](https://github.com/videojs/v10/pull/164)
- Discussion template naming convention (#166) by @cjpillsbury in [#166](https://github.com/videojs/v10/pull/166)
- Add trademark notice to footer (#163) by @heff in [#163](https://github.com/videojs/v10/pull/163)

## [@videojs/core@0.1.0-preview.5] - 2025-11-03

### 🚀 Features
- Eject examples (#149) by @decepulis in [#149](https://github.com/videojs/v10/pull/149)
- Remove unnecessary hydration workarounds by @decepulis
- Add aside component by @decepulis
- Restrict dev mode analytics by @decepulis
- Prefetch links that require redirects by @decepulis
- Prefetch all links by @decepulis
- Film grain (#150) by @decepulis in [#150](https://github.com/videojs/v10/pull/150)
- Update html tooltip API / use command attr (#151) by @luwes in [#151](https://github.com/videojs/v10/pull/151)

### 🐛 Bug Fixes
- Scope HTML notice to HTML pages by @decepulis
- Connect html eject skins to media-provider by @decepulis
- Update discord invite URL by @decepulis
- Shrink Aside and Blockquote child margins by @decepulis
- Correct import on home page minimal skin by @decepulis
- Adjust footer for safari and firefox by @decepulis
- Improve legibility of aside by @decepulis
- Improve header typography by @decepulis
- Apply body background color by @decepulis
- Tighten mobile framework selector by @decepulis
- Stretch docs sidebar on desktop to prevent safari visual bug by @decepulis
- Improve mobile home page spacing by @decepulis
- Raise component demos above texture by @decepulis
- More reliable tabs (#153) by @decepulis in [#153](https://github.com/videojs/v10/pull/153)
- Use MediaProvider on home page (#154) by @decepulis in [#154](https://github.com/videojs/v10/pull/154)
- Fix repo links in CONTRIBUTING.md by @heff

### 📚 Documentation
- Typo by @mihar-22
- Specify npm dist tag (#155) by @decepulis in [#155](https://github.com/videojs/v10/pull/155)

### ⚙️ Miscellaneous Tasks
- Update html demo to trigger build :( by @luwes
- Update discord link (#156) by @heff in [#156](https://github.com/videojs/v10/pull/156)

### ◀️ Revert
- Remove unnecessary hydration workarounds by @decepulis

## [@videojs/core@0.1.0-preview.4] - 2025-10-30

### 🚀 Features
- Add element registrations by @mihar-22

### 📚 Documentation
- Initial concepts and recipes (#147) by @decepulis in [#147](https://github.com/videojs/v10/pull/147)
- Update element imports by @mihar-22

### ⚙️ Miscellaneous Tasks
- Move dom types down by @mihar-22
- Update architecture docs by @mihar-22
- Add timeline by @mihar-22
- Add dom lib types by @mihar-22
- Fix architecture link in readme by @mihar-22
- Add contributing.md by @mihar-22
- Update claude.md by @mihar-22
- Remove bbb.mp4 by @mihar-22

## [@videojs/core@0.1.0-preview.3] - 2025-10-29

### 🚀 Features
- Skin design improvements, add html frosted skin (WIP) (#133) by @sampotts in [#133](https://github.com/videojs/v10/pull/133)
- Add html port of minimal skin (#140) by @sampotts in [#140](https://github.com/videojs/v10/pull/140)
- Update favicon and theme color based on dark mode by @decepulis
- Raise prominence of home page demo toggles by @decepulis
- Idiomatic html markup, use popover API, add safe polygon utility (#143) by @luwes in [#143](https://github.com/videojs/v10/pull/143)
- Tabs (#144) by @decepulis in [#144](https://github.com/videojs/v10/pull/144)

### 🐛 Bug Fixes
- Add viewport meta element (#135) by @sampotts in [#135](https://github.com/videojs/v10/pull/135)
- Add aspect-ratio to demos (#136) by @sampotts in [#136](https://github.com/videojs/v10/pull/136)
- Remove `show-remaining` in HTML example (#137) by @sampotts in [#137](https://github.com/videojs/v10/pull/137)
- Update version badges (#138) by @mihar-22 in [#138](https://github.com/videojs/v10/pull/138)
- Prevent dev build race condition (#139) by @sampotts in [#139](https://github.com/videojs/v10/pull/139)
- Improve legibility with heavier font weight (#141) by @decepulis in [#141](https://github.com/videojs/v10/pull/141)
- Visually hidden focus guards (#142) by @luwes in [#142](https://github.com/videojs/v10/pull/142)
- Add aria-hidden to focus guards by @luwes
- Remove unnecessary keyboard utils (#146) by @luwes in [#146](https://github.com/videojs/v10/pull/146)

### 📚 Documentation
- Initial component examples (#123) by @cjpillsbury in [#123](https://github.com/videojs/v10/pull/123)

### ⚙️ Miscellaneous Tasks
- Ignore linting commits starting with wip by @mihar-22
- Hide blog by @decepulis
- Update roadmap by @decepulis
- Add postcss-prefix-selector types by @mihar-22
- Rename website to site by @decepulis
- Update repo URLs (#145) by @luwes in [#145](https://github.com/videojs/v10/pull/145)
- Update privacy policy by @decepulis

## [@videojs/core@0.1.0-preview.2] - 2025-10-25

### 🐛 Bug Fixes
- Remove dry-run from publish command by @luwes
- Update README to use v10 terminology by @luwes

## [@videojs/core@0.1.0-preview.1] - 2025-10-25

### 🚀 Features
- Initialize Video.js 10 monorepo with core architecture by @cjpillsbury
- Migrate prototype code to organized package structure by @cjpillsbury
- Migrate entire monorepo from tsc to tsup for production builds by @cjpillsbury
- Migrate examples from prototype and add CSS modules support by @cjpillsbury
- Enable automatic CSS injection for MediaSkinDefault component by @cjpillsbury
- Implement Turbo for build optimization and caching by @cjpillsbury
- Implement shared SVG icon system across packages by @cjpillsbury
- Implement SVGR-powered auto-generation with full styling support by @cjpillsbury
- Add shallowEqual utility for optimized state comparisons by @cjpillsbury
- Configure separate default ports for React and HTML demos by @cjpillsbury in [#6](https://github.com/videojs/v10/pull/6)
- Implement temporal state management for time-based media controls by @cjpillsbury in [#7](https://github.com/videojs/v10/pull/7)
- Implement VolumeRange component with integrated state management by @cjpillsbury
- Implement TimeRange component with hook-style architecture by @cjpillsbury
- Add fullscreen enter and exit icons by @cjpillsbury
- Add fullscreen state mediator with shadow DOM support by @cjpillsbury
- Add fullscreen button component state definition by @cjpillsbury
- Add fullscreen button component and icons by @cjpillsbury
- Add fullscreen button component by @cjpillsbury
- Integrate fullscreen button into control bar and improve container lifecycle by @cjpillsbury
- Add MediaContainer component for fullscreen functionality by @cjpillsbury
- Add comprehensive time formatting utilities by @cjpillsbury
- Add duration display component state definition by @cjpillsbury
- Implement duration display component by @cjpillsbury
- Implement duration display component by @cjpillsbury
- Integrate duration display into default skins by @cjpillsbury
- Implement current time display components by @cjpillsbury
- Add showRemaining functionality to current time display by @cjpillsbury
- Make time range compound component (#10) by @luwes in [#10](https://github.com/videojs/v10/pull/10)
- Add compound html timerange component (#14) by @luwes in [#14](https://github.com/videojs/v10/pull/14)
- Port over default skin by @sampotts
- Minor style tweaks by @sampotts in [#16](https://github.com/videojs/v10/pull/16)
- Add volume range compound component (#19) by @luwes in [#19](https://github.com/videojs/v10/pull/19)
- Add core range, time and volume range (#23) by @luwes in [#23](https://github.com/videojs/v10/pull/23)
- Add range orientation to react components (#30) by @luwes in [#30](https://github.com/videojs/v10/pull/30)
- Add HTML vertical orientation to time and volume (#32) by @luwes in [#32](https://github.com/videojs/v10/pull/32)
- Add popover React component (#33) by @luwes in [#33](https://github.com/videojs/v10/pull/33)
- Add media-popover, cleanup html demo (#34) by @luwes in [#34](https://github.com/videojs/v10/pull/34)
- Add toasted skin by @sampotts in [#37](https://github.com/videojs/v10/pull/37)
- Styling fixes for toasted skin (#38) by @sampotts in [#38](https://github.com/videojs/v10/pull/38)
- Add React tooltip component (#35) by @luwes in [#35](https://github.com/videojs/v10/pull/35)
- Add HTML tooltip component (#40) by @luwes in [#40](https://github.com/videojs/v10/pull/40)
- Add transition status to React tooltip (#42) by @luwes in [#42](https://github.com/videojs/v10/pull/42)
- Rename range to slider (#46) by @luwes in [#46](https://github.com/videojs/v10/pull/46)
- Micro icons, toasted design tweaks (#52) by @sampotts in [#52](https://github.com/videojs/v10/pull/52)
- More skin style tweaks (#53) by @sampotts in [#53](https://github.com/videojs/v10/pull/53)
- Add a solution for React preview time display (#50) by @luwes in [#50](https://github.com/videojs/v10/pull/50)
- Add html preview time display (#58) by @luwes in [#58](https://github.com/videojs/v10/pull/58)
- Add tooltip transition status by @luwes
- Skin and icon tweaks (#59) by @sampotts in [#59](https://github.com/videojs/v10/pull/59)
- Add data style attributes to popover (#62) by @luwes in [#62](https://github.com/videojs/v10/pull/62)
- Website (#45) by @decepulis in [#45](https://github.com/videojs/v10/pull/45)
- Add posthog analytics (#71) by @decepulis in [#71](https://github.com/videojs/v10/pull/71)
- Favicon by @decepulis
- Add focus state to sliders and volume slider (#60) by @luwes in [#60](https://github.com/videojs/v10/pull/60)
- Discord link by @decepulis
- Social links in footer by @decepulis
- Init dark mode by @decepulis
- Add keyboard control to sliders (#115) by @luwes in [#115](https://github.com/videojs/v10/pull/115)
- Add Tailwind v4 compiled CSS for skins with vjs prefix (#114) by @cjpillsbury in [#114](https://github.com/videojs/v10/pull/114)
- Add display click to play / pause (#117) by @luwes in [#117](https://github.com/videojs/v10/pull/117)
- Adding simple video (#125) by @cjpillsbury in [#125](https://github.com/videojs/v10/pull/125)
- Skin design tweaks (#126) by @sampotts in [#126](https://github.com/videojs/v10/pull/126)

### 🐛 Bug Fixes
- Remove duplicate noImplicitReturns key in tsconfig.base.json by @cjpillsbury
- Convert pnpm workspace protocol to npm workspace syntax by @cjpillsbury
- Resolve TypeScript build errors across packages by @cjpillsbury
- Correct build:libs command to use explicit package names by @cjpillsbury
- Resolve declaration file generation for rollup packages (#1) by @cjpillsbury in [#1](https://github.com/videojs/v10/pull/1)
- Resolve package dependency and TypeScript export issues by @cjpillsbury
- Resolve @open-wc/context-protocol module resolution issues by @cjpillsbury
- Refactor private fields to public with underscore convention by @cjpillsbury
- Clean up more typescript errors. by @cjpillsbury
- Use explicit exports to resolve React package TypeScript errors by @cjpillsbury
- Resolve TypeScript error in dispatch method by @cjpillsbury in [#3](https://github.com/videojs/v10/pull/3)
- Implement proper HTML boolean data attributes for components by @cjpillsbury
- Resolve TypeScript declaration generation build issues by @cjpillsbury
- Replace tsup with rollup for consistent build tooling by @cjpillsbury
- Add currentColor fill to fullscreen icons for proper theming by @cjpillsbury in [#11](https://github.com/videojs/v10/pull/11)
- Clean up time utilities and simplify components by @cjpillsbury in [#12](https://github.com/videojs/v10/pull/12)
- Seek jump back to current time (#22) by @luwes in [#22](https://github.com/videojs/v10/pull/22)
- Add missing prettier plugin (remove later) by @sampotts in [#25](https://github.com/videojs/v10/pull/25)
- Skin exports/imports by @sampotts in [#26](https://github.com/videojs/v10/pull/26)
- Revert style testing change by @sampotts in [#27](https://github.com/videojs/v10/pull/27)
- React version mismatch, add forward refs by @luwes
- Rename attributes to kebab-case by @luwes
- Enable eslint & run eslint:fix (#43) by @luwes in [#43](https://github.com/videojs/v10/pull/43)
- Design tweaks to toasted skin, lint rule tweaks (#44) by @sampotts in [#44](https://github.com/videojs/v10/pull/44)
- Skin syntax usage cleanup (#48) by @cjpillsbury in [#48](https://github.com/videojs/v10/pull/48)
- Tone down text shadow on toasted skin (#54) by @sampotts in [#54](https://github.com/videojs/v10/pull/54)
- Tooltip syntax error & remove restMs by @luwes
- More consistent marquee speed + loop by @decepulis
- Align home page controls on mobile by @decepulis
- Minimal volume slider bug & fix dev infinite bug (#73) by @luwes in [#73](https://github.com/videojs/v10/pull/73)
- Resolve Safari hydration error by @decepulis
- Footer link highlight scoping by @decepulis
- Mobile optimizations by @decepulis
- Lighter text in dark mode by @decepulis
- Turborepo cache vercel output (#118) by @decepulis in [#118](https://github.com/videojs/v10/pull/118)
- Add videojs keyword to package.json by @luwes

### 💼 Other
- Refactor(html): implement hook-style component architecture for PlayButton and MuteButton by @cjpillsbury
- Removing react-native. Aiming for 18.x react dependencies cross-workspace to avoid bugs. (#49) by @cjpillsbury in [#49](https://github.com/videojs/v10/pull/49)

### 🚜 Refactor
- Convert React Native packages to stubs and fix remaining build issues by @cjpillsbury
- Replace tsup with rollup for proper CSS modules support by @cjpillsbury
- Migrate key packages from tsup to rollup for build consistency by @cjpillsbury
- Consolidate MuteButton components into unified implementation by @cjpillsbury
- Continue with component hooks rearchitecture. by @cjpillsbury
- Implement hooks-based PlayButton architecture by @cjpillsbury
- Create shared component factory for reusable architecture by @cjpillsbury
- Implement hook-style component architecture for PlayButton and MuteButton (gradual migration to more shareable with React). by @cjpillsbury
- Standardize state property names across core, HTML, and React packages by @cjpillsbury
- Implement hook-style component architecture for PlayButton by @cjpillsbury
- Implement hook-style component architecture for MuteButton by @cjpillsbury
- Implement hook-style component architecture for MuteButton by @cjpillsbury
- Update PlayButton to use centralized state definitions by @cjpillsbury
- Migrate component state definitions to core media-store by @cjpillsbury in [#4](https://github.com/videojs/v10/pull/4)
- Consolidate Video component into single module by @cjpillsbury in [#5](https://github.com/videojs/v10/pull/5)
- Restructure VolumeRange to use render function pattern by @cjpillsbury
- Update VolumeRange to use handleEvent pattern for consistency by @cjpillsbury
- Replace mediaEvents with stateOwnersUpdateHandlers pattern by @cjpillsbury
- Add container state owner and rename event types by @cjpillsbury
- Remove temporary fullscreen test code from play button by @cjpillsbury
- Move time formatting logic to platform components by @cjpillsbury
- Rename formatDuration to formatDisplayTime by @cjpillsbury
- Remove container radius from the skin by @sampotts

### 📚 Documentation
- Architecture docs (#51) by @cjpillsbury in [#51](https://github.com/videojs/v10/pull/51)
- Architecture docs v2 (#55) by @cjpillsbury in [#55](https://github.com/videojs/v10/pull/55)
- Readmes v0 (#72) by @cjpillsbury in [#72](https://github.com/videojs/v10/pull/72)

### 🎨 Styling
- Clean up code formatting and video source organization by @cjpillsbury
- Add visual styling to time display components by @cjpillsbury

### ⚙️ Miscellaneous Tasks
- Remove debug console.log statements and fix TypeScript declarations by @cjpillsbury
- Add todo code comments. by @cjpillsbury
- Add todo code comments. by @cjpillsbury
- Remove range css from skins for now. by @cjpillsbury in [#8](https://github.com/videojs/v10/pull/8)
- Swapping out m3u8 example asset for react demo. by @cjpillsbury
- Remove accidentally committed .playwright-mcp files by @cjpillsbury
- Add .playwright-mcp to .gitignore by @cjpillsbury
- Add prettier by @mihar-22 in [#17](https://github.com/videojs/v10/pull/17)
- Npm -> pnpm by @mihar-22 in [#18](https://github.com/videojs/v10/pull/18)
- New builds & types using tsdown (#20) by @mihar-22 in [#20](https://github.com/videojs/v10/pull/20)
- Gitignore cleanup (#21) by @mihar-22 in [#21](https://github.com/videojs/v10/pull/21)
- Add linting config by @sampotts in [#24](https://github.com/videojs/v10/pull/24)
- Cleanup demo config (#28) by @mihar-22 in [#28](https://github.com/videojs/v10/pull/28)
- Remove use-node-version, Vercel deployment by @luwes
- Add generate:icons to build dependsOn by @luwes
- Copy update to trigger a deploy (#39) by @sampotts in [#39](https://github.com/videojs/v10/pull/39)
- Website tooling (#41) by @decepulis in [#41](https://github.com/videojs/v10/pull/41)
- Consistent formatting (#47) by @cjpillsbury in [#47](https://github.com/videojs/v10/pull/47)
- Fix dup React versions by @luwes
- Resolve alias during build (#56) by @mihar-22 in [#56](https://github.com/videojs/v10/pull/56)
- `__dirname` not defined  (#57) by @mihar-22 in [#57](https://github.com/videojs/v10/pull/57)
- Rename skins, minor style tweaks (#61) by @sampotts in [#61](https://github.com/videojs/v10/pull/61)
- Error and artifact cleanup by @decepulis
- Add CI build workflow by @luwes
- Fix html-demo not importing skin (#127) by @mihar-22 in [#127](https://github.com/videojs/v10/pull/127)
- Add commitlint (#129) by @mihar-22 in [#129](https://github.com/videojs/v10/pull/129)
- Add release-please workflow (#128) by @luwes in [#128](https://github.com/videojs/v10/pull/128)
- Add if statement to pnpm by @luwes

### New Contributors
* @github-actions[bot] made their first contribution in [#130](https://github.com/videojs/v10/pull/130)
* @luwes made their first contribution
* @mihar-22 made their first contribution in [#129](https://github.com/videojs/v10/pull/129)
* @sampotts made their first contribution in [#126](https://github.com/videojs/v10/pull/126)
* @cjpillsbury made their first contribution in [#125](https://github.com/videojs/v10/pull/125)
* @decepulis made their first contribution in [#118](https://github.com/videojs/v10/pull/118)
* @heff made their first contribution

[unreleased]: https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.5...HEAD
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
