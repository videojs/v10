# Changelog

## [10.0.0-beta.9](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.8...@videojs/core@10.0.0-beta.9) (2026-03-23)


### Features

* **skin:** add error handling for audio players ([#1048](https://github.com/videojs/v10/issues/1048)) ([df927f6](https://github.com/videojs/v10/commit/df927f67fcbd0aaa229b1a8e205ab3cb08f7a42d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-beta.9
    * @videojs/store bumped to 10.0.0-beta.9
    * @videojs/utils bumped to 10.0.0-beta.9

## [10.0.0-beta.8](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.7...@videojs/core@10.0.0-beta.8) (2026-03-20)


### Miscellaneous Chores

* **@videojs/core:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-beta.8
    * @videojs/store bumped to 10.0.0-beta.8
    * @videojs/utils bumped to 10.0.0-beta.8

## [10.0.0-beta.7](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.6...@videojs/core@10.0.0-beta.7) (2026-03-19)


### Features

* add DashVideo media element (html, react) with sandbox support ([#940](https://github.com/videojs/v10/issues/940)) ([5bdbbec](https://github.com/videojs/v10/commit/5bdbbec8a0f69b4be89600287c63a04746b7ba49))
* **html:** add data-availability to volume slider ([#1001](https://github.com/videojs/v10/issues/1001)) ([c95e134](https://github.com/videojs/v10/commit/c95e1343e16c8667f6b7f5560d12ec5f36f1acd8))


### Bug Fixes

* **core:** improve fullscreen and pip webkit fallback handling ([#999](https://github.com/videojs/v10/issues/999)) ([a05e8f2](https://github.com/videojs/v10/commit/a05e8f20af4fcc4e506f461fb0244acf24564e13))
* **core:** prevent slider thumb jump on pointer release ([#990](https://github.com/videojs/v10/issues/990)) ([b9bada9](https://github.com/videojs/v10/commit/b9bada95675f09b7c7d6859dcd213be7a0408bb7))
* **core:** rename MediaDelegateMixin and MediaProxyMixin ([#976](https://github.com/videojs/v10/issues/976)) ([561d03e](https://github.com/videojs/v10/commit/561d03eb5ae87aa3ba2bb5d4d68987ef4067e90e))
* **core:** round thumbnail dimensions to prevent sub-pixel gaps ([#995](https://github.com/videojs/v10/issues/995)) ([636ccd4](https://github.com/videojs/v10/commit/636ccd45daab5e2726f26b6412b72b2725ff6373))
* **core:** stub pointer:fine in tooltip touch suppression tests ([#998](https://github.com/videojs/v10/issues/998)) ([fc62ea1](https://github.com/videojs/v10/commit/fc62ea1c0ae20e53468b8a2ec57dc11f8e021b17))
* **core:** suppress tooltip hover on touch pointer events ([#933](https://github.com/videojs/v10/issues/933)) ([324ea2f](https://github.com/videojs/v10/commit/324ea2fd3b0410f5c64ae6761aebaf6b7db29a47))
* **core:** sync playback feature state on seeked event ([#1000](https://github.com/videojs/v10/issues/1000)) ([12f582e](https://github.com/videojs/v10/commit/12f582ec1a7819e38c800664dd05c687c77fff6c))
* correct popup fallback positioning offsets ([#981](https://github.com/videojs/v10/issues/981)) ([82ede77](https://github.com/videojs/v10/commit/82ede77322204500d7ca0adc5cb24d4f068af462))
* **skin:** add subtle control transitions on touch devices ([#985](https://github.com/videojs/v10/issues/985)) ([7e0827c](https://github.com/videojs/v10/commit/7e0827c330dc796aa0375cd5839fc4fc1661f055))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-beta.7
    * @videojs/store bumped to 10.0.0-beta.7
    * @videojs/utils bumped to 10.0.0-beta.7

## [10.0.0-beta.6](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.5...@videojs/core@10.0.0-beta.6) (2026-03-15)


### Features

* add slider preview thumbnails ([#935](https://github.com/videojs/v10/issues/935)) ([e3f438e](https://github.com/videojs/v10/commit/e3f438e9f488f41c8cf51c95507bc41fc5b524d0))


### Bug Fixes

* **html:** simplify styles for slotted video ([#953](https://github.com/videojs/v10/issues/953)) ([d6e471a](https://github.com/videojs/v10/commit/d6e471a8377e9ee8ef63df9097810c6d0c1bb2f9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-beta.6
    * @videojs/store bumped to 10.0.0-beta.6
    * @videojs/utils bumped to 10.0.0-beta.6

## [10.0.0-beta.5](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.4...@videojs/core@10.0.0-beta.5) (2026-03-12)


### Miscellaneous Chores

* **@videojs/core:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-beta.5
    * @videojs/store bumped to 10.0.0-beta.5
    * @videojs/utils bumped to 10.0.0-beta.5

## [10.0.0-beta.4](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.3...@videojs/core@10.0.0-beta.4) (2026-03-12)


### Bug Fixes

* attaching media like elements and upgrade ([#889](https://github.com/videojs/v10/issues/889)) ([2105010](https://github.com/videojs/v10/commit/2105010c7f1f525ab89cc30506219a5dd49a64a7))
* **core:** skip delay when switching between grouped tooltips ([#903](https://github.com/videojs/v10/issues/903)) ([ff8fb3f](https://github.com/videojs/v10/commit/ff8fb3fd36b0eeda9d2d861c83d4db51f60650a0))
* mobile controls issues ([#896](https://github.com/videojs/v10/issues/896)) ([b892cfc](https://github.com/videojs/v10/commit/b892cfc2615feff919c701f1bd5840e40f3d5d54))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-beta.4
    * @videojs/store bumped to 10.0.0-beta.4
    * @videojs/utils bumped to 10.0.0-beta.4

## [10.0.0-beta.3](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.2...@videojs/core@10.0.0-beta.3) (2026-03-11)


### Bug Fixes

* **core:** resolve pip state against media target ([#883](https://github.com/videojs/v10/issues/883)) ([45a312e](https://github.com/videojs/v10/commit/45a312e0162bc66983eb7f41701a1bf28019736f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-beta.3
    * @videojs/store bumped to 10.0.0-beta.3
    * @videojs/utils bumped to 10.0.0-beta.3

## [10.0.0-beta.2](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.1...@videojs/core@10.0.0-beta.2) (2026-03-10)


### Miscellaneous Chores

* **@videojs/core:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-beta.2
    * @videojs/store bumped to 10.0.0-beta.2
    * @videojs/utils bumped to 10.0.0-beta.2

## [10.0.0-beta.1](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-beta.0...@videojs/core@10.0.0-beta.1) (2026-03-10)


### Features

* add media API + HLS video components ([#507](https://github.com/videojs/v10/issues/507)) ([b3a31a3](https://github.com/videojs/v10/commit/b3a31a335a363d3a96b510206b57d1bb9ebb8edd))
* add media delegate mixin ([#598](https://github.com/videojs/v10/issues/598)) ([c4ef94e](https://github.com/videojs/v10/commit/c4ef94e82301be6705002d0a7d7c65463ece1045))
* add subtitles handling + captions core ([#692](https://github.com/videojs/v10/issues/692)) ([5c11606](https://github.com/videojs/v10/commit/5c116065a91ed04753bb2cb83e72dd6471f75ced))
* add tooltip core ([#212](https://github.com/videojs/v10/issues/212)) ([cbf41ce](https://github.com/videojs/v10/commit/cbf41ce4c750cd5c3bb6cbf247bad91ccd578cd0))
* **core:** add alert dialog with dismiss layer and transitions ([#743](https://github.com/videojs/v10/issues/743)) ([a80cf4e](https://github.com/videojs/v10/commit/a80cf4e06aaa6adfd5e916b4789cb40ac15ef9cf))
* **core:** add AlertDialog data attributes ([#738](https://github.com/videojs/v10/issues/738)) ([e2334a3](https://github.com/videojs/v10/commit/e2334a3767c8f9474d44c8baa25512041392e363))
* **core:** add buffering indicator component ([#527](https://github.com/videojs/v10/issues/527)) ([aa0fb7c](https://github.com/videojs/v10/commit/aa0fb7ca704843dd6ac8b0b18d9e35f8f430311e))
* **core:** add controls component with activity tracking ([#514](https://github.com/videojs/v10/issues/514)) ([90d881c](https://github.com/videojs/v10/commit/90d881cec21d7f5e1e619061727e6c8d1ff48296))
* **core:** add error feature ([#713](https://github.com/videojs/v10/issues/713)) ([879d55d](https://github.com/videojs/v10/commit/879d55d1d216aac9f31f3fb22e2e31fde55a002b))
* **core:** add fullscreen button component ([#459](https://github.com/videojs/v10/issues/459)) ([3c4152f](https://github.com/videojs/v10/commit/3c4152fb5845965334cfd7e3c2623ac978377d96))
* **core:** add mute button component ([#455](https://github.com/videojs/v10/issues/455)) ([aa189ee](https://github.com/videojs/v10/commit/aa189eec84482afde4dd42fc547af4759ea51742))
* **core:** add pip button component ([#525](https://github.com/videojs/v10/issues/525)) ([2c8b77a](https://github.com/videojs/v10/commit/2c8b77af4547b0a8af27abcc419f7d4dff3b005a))
* **core:** add play button component ([#383](https://github.com/videojs/v10/issues/383)) ([9cfab26](https://github.com/videojs/v10/commit/9cfab264d85ea5b8e20fc2d020171ba5ef53b0f4))
* **core:** add player target and feature selectors ([#371](https://github.com/videojs/v10/issues/371)) ([1bde6e9](https://github.com/videojs/v10/commit/1bde6e950a6024769cf63d04c66d1646fd31cc98))
* **core:** add popover component ([#615](https://github.com/videojs/v10/issues/615)) ([44188d4](https://github.com/videojs/v10/commit/44188d4823d687bae2806f38e199e9719ff05083))
* **core:** add poster component ([#457](https://github.com/videojs/v10/issues/457)) ([c9ba1e1](https://github.com/videojs/v10/commit/c9ba1e1bfc83e02981a2ffad0a0f247092068687))
* **core:** add presentation feature ([#458](https://github.com/videojs/v10/issues/458)) ([d5e5cec](https://github.com/videojs/v10/commit/d5e5cec6ab2f81275f488dcaa66edef573ce10bf))
* **core:** add seek button component ([#526](https://github.com/videojs/v10/issues/526)) ([c733077](https://github.com/videojs/v10/commit/c733077d324b3cd40eab7c0e33f1f73592609515))
* **core:** add slider dom ([#613](https://github.com/videojs/v10/issues/613)) ([4c7d287](https://github.com/videojs/v10/commit/4c7d287d357e1f1b820aca62b0a26eda225c441f))
* **core:** add thumbnail component and text track store feature ([#643](https://github.com/videojs/v10/issues/643)) ([7bae887](https://github.com/videojs/v10/commit/7bae887920a71665fdd24a2f0aca0718de062084))
* **core:** add time display component ([#460](https://github.com/videojs/v10/issues/460)) ([7b8bc11](https://github.com/videojs/v10/commit/7b8bc11f9f90684269b6acebeb79677063112e1f))
* **core:** add tooltip  ([#734](https://github.com/videojs/v10/issues/734)) ([b69a2f9](https://github.com/videojs/v10/commit/b69a2f9994eaf14f4f2bf64643d8fc18e901b365))
* **core:** dom media slices ([#292](https://github.com/videojs/v10/issues/292)) ([47659f5](https://github.com/videojs/v10/commit/47659f5352634ef094b9ab83476a59ac1f244115))
* **example/react:** improvements to react examples ([#210](https://github.com/videojs/v10/issues/210)) ([c35b012](https://github.com/videojs/v10/commit/c35b0122509ce3230dcfce4a0acf0d315ba5f0ee))
* **html:** add slider element ([#655](https://github.com/videojs/v10/issues/655)) ([d5df015](https://github.com/videojs/v10/commit/d5df0150b3aef21c15d3a65c015bb6058e95ce53))
* **html:** add time slider element ([#656](https://github.com/videojs/v10/issues/656)) ([26c7395](https://github.com/videojs/v10/commit/26c7395cd0fe7e2fe8a8020ffae40cf81ffb3974))
* **html:** add tooltip element ([#735](https://github.com/videojs/v10/issues/735)) ([e9fbaec](https://github.com/videojs/v10/commit/e9fbaece87c39c0adc41070159fd7e6f75f0e1da))
* **html:** add volume slider element ([#657](https://github.com/videojs/v10/issues/657)) ([92b7c2a](https://github.com/videojs/v10/commit/92b7c2ac184d12c780ba1a1bb6f064782b77422a))
* **html:** reorganize import paths by use case ([#480](https://github.com/videojs/v10/issues/480)) ([870cbb7](https://github.com/videojs/v10/commit/870cbb77e4ac45d179d8702d0e08c58face8a2fc))
* **html:** setup player api ([#374](https://github.com/videojs/v10/issues/374)) ([a419f5e](https://github.com/videojs/v10/commit/a419f5ef190a47575c4a7e11353a5454e6ee7fe6))
* **packages:** add PlaybackRateButton to core, html, and react ([#642](https://github.com/videojs/v10/issues/642)) ([0180828](https://github.com/videojs/v10/commit/0180828df91ad74f885906223fa7d359f1a2641a))
* **packages:** add slider core layer ([#529](https://github.com/videojs/v10/issues/529)) ([7efee3d](https://github.com/videojs/v10/commit/7efee3d03361f195706257b4950708cbe5356cf5))
* **react:** add slider component ([#644](https://github.com/videojs/v10/issues/644)) ([2f8ca09](https://github.com/videojs/v10/commit/2f8ca094ad5bc5bafc5435c2e97bca58c6d29b5d))
* **react:** add slider preview component ([#710](https://github.com/videojs/v10/issues/710)) ([db75697](https://github.com/videojs/v10/commit/db7569711e5a571f6af421987c8490c3de37ed78))
* **react:** implement default and minimal video skins ([#550](https://github.com/videojs/v10/issues/550)) ([7d3be36](https://github.com/videojs/v10/commit/7d3be367f5b31b8a6d5b9a9e3c87245f95b8e22a))
* **react:** implement video skins with responsive layout ([#568](https://github.com/videojs/v10/issues/568)) ([846d38e](https://github.com/videojs/v10/commit/846d38e79b11ba8de62bdb239bc1358e9abc28de))
* **site:** add TimeSlider, VolumeSlider, Popover API references ([#685](https://github.com/videojs/v10/issues/685)) ([8ab596e](https://github.com/videojs/v10/commit/8ab596ea30291d48962684203d153c689e1b0fec))
* **site:** add util reference pipeline ([#537](https://github.com/videojs/v10/issues/537)) ([78112fb](https://github.com/videojs/v10/commit/78112fbefdaace678a2d1335409e40533f3819fa))
* **site:** generated multipart component api reference ([#468](https://github.com/videojs/v10/issues/468)) ([4b1e863](https://github.com/videojs/v10/commit/4b1e863883f730f561a490e58223d8298b5bef5c))
* small state and naming fixes  ([#719](https://github.com/videojs/v10/issues/719)) ([5c42245](https://github.com/videojs/v10/commit/5c422452e4b547dc00f13082b755ea12d1860f21))
* **spf:** initial push of SPF ([#784](https://github.com/videojs/v10/issues/784)) ([27a3993](https://github.com/videojs/v10/commit/27a3993fb20af0523e42b0d03c70a6f5a465d144))
* **store:** lit bindings ([#289](https://github.com/videojs/v10/issues/289)) ([648aae7](https://github.com/videojs/v10/commit/648aae7e31db02f6d69dba138b98e7cbfd398902))


### Bug Fixes

* add popover core, use in html and improve factory ([#204](https://github.com/videojs/v10/issues/204)) ([f3b1b19](https://github.com/videojs/v10/commit/f3b1b199173f3750bc05ad9063fcccbd4163b12b))
* add SSR stubs for HLS media ([#641](https://github.com/videojs/v10/issues/641)) ([2b50825](https://github.com/videojs/v10/commit/2b508255736e0d9083a1a0baa90850de85f29b92))
* **cd:** add repository field to all packages for provenance verification ([b723589](https://github.com/videojs/v10/commit/b72358904a78a9403df16d77936d4a1f41a64bfe))
* clean up core, less seams in wrappers ([#197](https://github.com/videojs/v10/issues/197)) ([601a5a3](https://github.com/videojs/v10/commit/601a5a37939605ca38f81a825fd02934e7928c39))
* **core:** auto-unmute on volume change and restore volume on unmute ([#752](https://github.com/videojs/v10/issues/752)) ([4466d0a](https://github.com/videojs/v10/commit/4466d0a15c2be9d1a0c23dace95cbd079d228d97))
* **core:** derive effective mute state for volume UI components ([#753](https://github.com/videojs/v10/issues/753)) ([14bcdc8](https://github.com/videojs/v10/commit/14bcdc833f0a09bb3ca92d8a02e68b6802aeebac))
* **core:** fix circular import and simplify media types ([#569](https://github.com/videojs/v10/issues/569)) ([38b3a8f](https://github.com/videojs/v10/commit/38b3a8f55ca96938db92fa06c0d171bf544ffe3b))
* **core:** fixed fullscreen on ios safari ([#211](https://github.com/videojs/v10/issues/211)) ([6068633](https://github.com/videojs/v10/commit/6068633be0939c8024317abac0cb1cd5a262d07a))
* **core:** optimistic current time update on seek to prevent slider snap-back ([#799](https://github.com/videojs/v10/issues/799)) ([c605df5](https://github.com/videojs/v10/commit/c605df50f61e7e50067133e4e79458607fb4d3a9))
* **core:** preserve user props in time slider ([#621](https://github.com/videojs/v10/issues/621)) ([23528ca](https://github.com/videojs/v10/commit/23528cad88fe1645df686d4cd74eaf4806a35d6a))
* **core:** prevent slider track click from closing popover ([#776](https://github.com/videojs/v10/issues/776)) ([c20d884](https://github.com/videojs/v10/commit/c20d88493281f68e4716195fde59ec6134421902))
* **core:** update README to use v10 terminology ([93dd266](https://github.com/videojs/v10/commit/93dd266f551923e103111019e12834f27cefabe7))
* **core:** use camelCase attribute names in slider for react ([#708](https://github.com/videojs/v10/issues/708)) ([4e1f3af](https://github.com/videojs/v10/commit/4e1f3af2d71bfdacbd35e1363ecb8221e24558a3))
* **core:** use composedPath for popover outside-click detection ([#806](https://github.com/videojs/v10/issues/806)) ([747d159](https://github.com/videojs/v10/commit/747d15910be039413b658a00438f5edbdb7f19f6))
* **core:** use double-RAF in transition open to enable entry animations ([#755](https://github.com/videojs/v10/issues/755)) ([7b6b301](https://github.com/videojs/v10/commit/7b6b3019dfaa41e34970e5827bd2ba21c7712fbe))
* delegate not defining Delegate props ([#751](https://github.com/videojs/v10/issues/751)) ([c61fcdc](https://github.com/videojs/v10/commit/c61fcdcc3a64f8a4ef32ec3fd332f1ec5cdbb311))
* destroy hls.js instance on media unmount ([#749](https://github.com/videojs/v10/issues/749)) ([c4e8bbd](https://github.com/videojs/v10/commit/c4e8bbd3a2bcb66027c64faf8de0ec61d22c84fa))
* **html:** apply popover data attributes before showing via popover API ([#763](https://github.com/videojs/v10/issues/763)) ([206bc9b](https://github.com/videojs/v10/commit/206bc9b4ae914176e50c1708c272c75d90a12286))
* **html:** discover media elements and attach store target via DOM ([#481](https://github.com/videojs/v10/issues/481)) ([5eab1db](https://github.com/videojs/v10/commit/5eab1dbb2fbb906543f7749e5956c9791c30be34))
* **html:** slider interaction and edge alignment broken ([#721](https://github.com/videojs/v10/issues/721)) ([ff12296](https://github.com/videojs/v10/commit/ff122963553e23a58614c9c808763208fd893df1))
* **html:** thumb edge alignment jump ([#766](https://github.com/videojs/v10/issues/766)) ([d53e239](https://github.com/videojs/v10/commit/d53e239b7b59ad0d86ef961e19342c80568fe02d))
* **packages:** enable unbundle mode to avoid mangled exports ([00fdf96](https://github.com/videojs/v10/commit/00fdf966ca5148bcca303058dd798b1b880896e0))
* **packages:** set release-please manifest and package versions to beta.0 ([#850](https://github.com/videojs/v10/issues/850)) ([e085a0d](https://github.com/videojs/v10/commit/e085a0d73af0c142e0c0a371337daae98fdbaac9))
* **packages:** update package READMEs for beta ([#848](https://github.com/videojs/v10/issues/848)) ([9562a0e](https://github.com/videojs/v10/commit/9562a0ecca212034759d7cc948d4b3f0bc7a19c3))
* **packages:** update version badges ([#138](https://github.com/videojs/v10/issues/138)) ([22d9cb6](https://github.com/videojs/v10/commit/22d9cb64f2e5b9601a2039bb166dbe3fee6a1b3e))
* **root:** add videojs keyword to package.json ([4a9f8b2](https://github.com/videojs/v10/commit/4a9f8b2ad6fb27b463dcfe8d1a5fd883c9fa21d1))
* **site:** update discord link ([#170](https://github.com/videojs/v10/issues/170)) ([bb10294](https://github.com/videojs/v10/commit/bb10294419439fb02df650f3e7f7c5496ecc3a73))
* **slider:** keep pointer position after pointerleave ([#807](https://github.com/videojs/v10/issues/807)) ([cd019cb](https://github.com/videojs/v10/commit/cd019cbbf2444d3643438f1cd7b3ee05efc2350f))
* ssr issue with hls.js ([#758](https://github.com/videojs/v10/issues/758)) ([bcc492f](https://github.com/videojs/v10/commit/bcc492f63f8d3e248b3cbba67cbc516420270920))
* textTrackList and optimize ([#760](https://github.com/videojs/v10/issues/760)) ([04e98f4](https://github.com/videojs/v10/commit/04e98f4007dcc5957ff4b646482036da49e1efd4))
* use popover core in react popover ([#208](https://github.com/videojs/v10/issues/208)) ([99fef78](https://github.com/videojs/v10/commit/99fef78f63e8dd121513b9cd20696a7d35603837))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-beta.1
    * @videojs/store bumped to 10.0.0-beta.1
    * @videojs/utils bumped to 10.0.0-beta.1

## [10.0.0-alpha.11](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.10...@videojs/core@10.0.0-alpha.11) (2026-03-10)


### Miscellaneous Chores

* **@videojs/core:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-alpha.11
    * @videojs/store bumped to 10.0.0-alpha.11
    * @videojs/utils bumped to 10.0.0-alpha.11

## [10.0.0-alpha.10](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.9...@videojs/core@10.0.0-alpha.10) (2026-03-10)


### Features

* **spf:** initial push of SPF ([#784](https://github.com/videojs/v10/issues/784)) ([27a3993](https://github.com/videojs/v10/commit/27a3993fb20af0523e42b0d03c70a6f5a465d144))


### Bug Fixes

* **core:** optimistic current time update on seek to prevent slider snap-back ([#799](https://github.com/videojs/v10/issues/799)) ([c605df5](https://github.com/videojs/v10/commit/c605df50f61e7e50067133e4e79458607fb4d3a9))
* **core:** prevent slider track click from closing popover ([#776](https://github.com/videojs/v10/issues/776)) ([c20d884](https://github.com/videojs/v10/commit/c20d88493281f68e4716195fde59ec6134421902))
* **core:** use composedPath for popover outside-click detection ([#806](https://github.com/videojs/v10/issues/806)) ([747d159](https://github.com/videojs/v10/commit/747d15910be039413b658a00438f5edbdb7f19f6))
* **html:** apply popover data attributes before showing via popover API ([#763](https://github.com/videojs/v10/issues/763)) ([206bc9b](https://github.com/videojs/v10/commit/206bc9b4ae914176e50c1708c272c75d90a12286))
* **html:** thumb edge alignment jump ([#766](https://github.com/videojs/v10/issues/766)) ([d53e239](https://github.com/videojs/v10/commit/d53e239b7b59ad0d86ef961e19342c80568fe02d))
* **slider:** keep pointer position after pointerleave ([#807](https://github.com/videojs/v10/issues/807)) ([cd019cb](https://github.com/videojs/v10/commit/cd019cbbf2444d3643438f1cd7b3ee05efc2350f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-alpha.10
    * @videojs/store bumped to 10.0.0-alpha.10
    * @videojs/utils bumped to 10.0.0-alpha.10

## [10.0.0-alpha.9](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.8...@videojs/core@10.0.0-alpha.9) (2026-03-06)


### Features

* add subtitles handling + captions core ([#692](https://github.com/videojs/v10/issues/692)) ([5c11606](https://github.com/videojs/v10/commit/5c116065a91ed04753bb2cb83e72dd6471f75ced))


### Bug Fixes

* **core:** auto-unmute on volume change and restore volume on unmute ([#752](https://github.com/videojs/v10/issues/752)) ([4466d0a](https://github.com/videojs/v10/commit/4466d0a15c2be9d1a0c23dace95cbd079d228d97))
* **core:** derive effective mute state for volume UI components ([#753](https://github.com/videojs/v10/issues/753)) ([14bcdc8](https://github.com/videojs/v10/commit/14bcdc833f0a09bb3ca92d8a02e68b6802aeebac))
* **core:** use double-RAF in transition open to enable entry animations ([#755](https://github.com/videojs/v10/issues/755)) ([7b6b301](https://github.com/videojs/v10/commit/7b6b3019dfaa41e34970e5827bd2ba21c7712fbe))
* delegate not defining Delegate props ([#751](https://github.com/videojs/v10/issues/751)) ([c61fcdc](https://github.com/videojs/v10/commit/c61fcdcc3a64f8a4ef32ec3fd332f1ec5cdbb311))
* destroy hls.js instance on media unmount ([#749](https://github.com/videojs/v10/issues/749)) ([c4e8bbd](https://github.com/videojs/v10/commit/c4e8bbd3a2bcb66027c64faf8de0ec61d22c84fa))
* ssr issue with hls.js ([#758](https://github.com/videojs/v10/issues/758)) ([bcc492f](https://github.com/videojs/v10/commit/bcc492f63f8d3e248b3cbba67cbc516420270920))
* textTrackList and optimize ([#760](https://github.com/videojs/v10/issues/760)) ([04e98f4](https://github.com/videojs/v10/commit/04e98f4007dcc5957ff4b646482036da49e1efd4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/store bumped to 10.0.0-alpha.9
    * @videojs/utils bumped to 10.0.0-alpha.9

## [10.0.0-alpha.8](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.7...@videojs/core@10.0.0-alpha.8) (2026-03-05)


### Features

* **core:** add alert dialog with dismiss layer and transitions ([#743](https://github.com/videojs/v10/issues/743)) ([a80cf4e](https://github.com/videojs/v10/commit/a80cf4e06aaa6adfd5e916b4789cb40ac15ef9cf))
* **core:** add AlertDialog data attributes ([#738](https://github.com/videojs/v10/issues/738)) ([e2334a3](https://github.com/videojs/v10/commit/e2334a3767c8f9474d44c8baa25512041392e363))
* **core:** add error feature ([#713](https://github.com/videojs/v10/issues/713)) ([879d55d](https://github.com/videojs/v10/commit/879d55d1d216aac9f31f3fb22e2e31fde55a002b))
* **core:** add tooltip  ([#734](https://github.com/videojs/v10/issues/734)) ([b69a2f9](https://github.com/videojs/v10/commit/b69a2f9994eaf14f4f2bf64643d8fc18e901b365))
* **html:** add tooltip element ([#735](https://github.com/videojs/v10/issues/735)) ([e9fbaec](https://github.com/videojs/v10/commit/e9fbaece87c39c0adc41070159fd7e6f75f0e1da))
* **react:** add slider preview component ([#710](https://github.com/videojs/v10/issues/710)) ([db75697](https://github.com/videojs/v10/commit/db7569711e5a571f6af421987c8490c3de37ed78))
* small state and naming fixes  ([#719](https://github.com/videojs/v10/issues/719)) ([5c42245](https://github.com/videojs/v10/commit/5c422452e4b547dc00f13082b755ea12d1860f21))


### Bug Fixes

* **html:** slider interaction and edge alignment broken ([#721](https://github.com/videojs/v10/issues/721)) ([ff12296](https://github.com/videojs/v10/commit/ff122963553e23a58614c9c808763208fd893df1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/store bumped to 10.0.0-alpha.8
    * @videojs/utils bumped to 10.0.0-alpha.8

## [10.0.0-alpha.7](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.6...@videojs/core@10.0.0-alpha.7) (2026-03-04)


### Miscellaneous Chores

* **@videojs/core:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/store bumped to 10.0.0-alpha.7
    * @videojs/utils bumped to 10.0.0-alpha.7

## [10.0.0-alpha.6](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.5...@videojs/core@10.0.0-alpha.6) (2026-03-04)


### Bug Fixes

* **core:** use camelCase attribute names in slider for react ([#708](https://github.com/videojs/v10/issues/708)) ([4e1f3af](https://github.com/videojs/v10/commit/4e1f3af2d71bfdacbd35e1363ecb8221e24558a3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/store bumped to 10.0.0-alpha.6
    * @videojs/utils bumped to 10.0.0-alpha.6

## [10.0.0-alpha.5](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.4...@videojs/core@10.0.0-alpha.5) (2026-03-04)


### Features

* **core:** add popover component ([#615](https://github.com/videojs/v10/issues/615)) ([44188d4](https://github.com/videojs/v10/commit/44188d4823d687bae2806f38e199e9719ff05083))
* **core:** add thumbnail component and text track store feature ([#643](https://github.com/videojs/v10/issues/643)) ([7bae887](https://github.com/videojs/v10/commit/7bae887920a71665fdd24a2f0aca0718de062084))
* **html:** add slider element ([#655](https://github.com/videojs/v10/issues/655)) ([d5df015](https://github.com/videojs/v10/commit/d5df0150b3aef21c15d3a65c015bb6058e95ce53))
* **html:** add time slider element ([#656](https://github.com/videojs/v10/issues/656)) ([26c7395](https://github.com/videojs/v10/commit/26c7395cd0fe7e2fe8a8020ffae40cf81ffb3974))
* **html:** add volume slider element ([#657](https://github.com/videojs/v10/issues/657)) ([92b7c2a](https://github.com/videojs/v10/commit/92b7c2ac184d12c780ba1a1bb6f064782b77422a))
* **packages:** add PlaybackRateButton to core, html, and react ([#642](https://github.com/videojs/v10/issues/642)) ([0180828](https://github.com/videojs/v10/commit/0180828df91ad74f885906223fa7d359f1a2641a))
* **react:** add slider component ([#644](https://github.com/videojs/v10/issues/644)) ([2f8ca09](https://github.com/videojs/v10/commit/2f8ca094ad5bc5bafc5435c2e97bca58c6d29b5d))
* **site:** add TimeSlider, VolumeSlider, Popover API references ([#685](https://github.com/videojs/v10/issues/685)) ([8ab596e](https://github.com/videojs/v10/commit/8ab596ea30291d48962684203d153c689e1b0fec))


### Bug Fixes

* add SSR stubs for HLS media ([#641](https://github.com/videojs/v10/issues/641)) ([2b50825](https://github.com/videojs/v10/commit/2b508255736e0d9083a1a0baa90850de85f29b92))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/store bumped to 10.0.0-alpha.5
    * @videojs/utils bumped to 10.0.0-alpha.5

## [10.0.0-alpha.4](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.3...@videojs/core@10.0.0-alpha.4) (2026-02-26)


### Miscellaneous Chores

* **@videojs/core:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/store bumped to 10.0.0-alpha.4
    * @videojs/utils bumped to 10.0.0-alpha.4

## [10.0.0-alpha.3](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.2...@videojs/core@10.0.0-alpha.3) (2026-02-26)


### Bug Fixes

* **cd:** add repository field to all packages for provenance verification ([b723589](https://github.com/videojs/v10/commit/b72358904a78a9403df16d77936d4a1f41a64bfe))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/store bumped to 10.0.0-alpha.3
    * @videojs/utils bumped to 10.0.0-alpha.3

## [10.0.0-alpha.2](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.1...@videojs/core@10.0.0-alpha.2) (2026-02-26)


### Miscellaneous Chores

* **@videojs/core:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/store bumped to 10.0.0-alpha.2
    * @videojs/utils bumped to 10.0.0-alpha.2

## [10.0.0-alpha.1](https://github.com/videojs/v10/compare/@videojs/core@10.0.0-alpha.0...@videojs/core@10.0.0-alpha.1) (2026-02-26)


### Features

* add a solution for React preview time display ([#50](https://github.com/videojs/v10/issues/50)) ([f78b09f](https://github.com/videojs/v10/commit/f78b09fd16b7a9ee5a404c9260e3e764fb77ddde))
* add compound html timerange component ([#14](https://github.com/videojs/v10/issues/14)) ([017ecdb](https://github.com/videojs/v10/commit/017ecdbff991d140ea42e4a855269a54e0a19adc))
* add core range, time and volume range ([#23](https://github.com/videojs/v10/issues/23)) ([687b765](https://github.com/videojs/v10/commit/687b7655b0b6356c28663ca85c8f6d25a1023c18))
* add display click to play / pause ([#117](https://github.com/videojs/v10/issues/117)) ([4f06ef6](https://github.com/videojs/v10/commit/4f06ef6c7684fd7064ca76685003a1c38ebd09cd))
* add keyboard control to sliders ([#115](https://github.com/videojs/v10/issues/115)) ([0a49026](https://github.com/videojs/v10/commit/0a4902623d58f51055b1cc65498a0e716533ec29))
* add media API + HLS video components ([#507](https://github.com/videojs/v10/issues/507)) ([b3a31a3](https://github.com/videojs/v10/commit/b3a31a335a363d3a96b510206b57d1bb9ebb8edd))
* add media delegate mixin ([#598](https://github.com/videojs/v10/issues/598)) ([c4ef94e](https://github.com/videojs/v10/commit/c4ef94e82301be6705002d0a7d7c65463ece1045))
* add range orientation to react components ([#30](https://github.com/videojs/v10/issues/30)) ([5e3cb8a](https://github.com/videojs/v10/commit/5e3cb8ad8134ecaf20b6e021e301a38b8ed06de2))
* add tooltip core ([#212](https://github.com/videojs/v10/issues/212)) ([cbf41ce](https://github.com/videojs/v10/commit/cbf41ce4c750cd5c3bb6cbf247bad91ccd578cd0))
* **core,html,react:** implement VolumeRange component with integrated state management ([2282f47](https://github.com/videojs/v10/commit/2282f4799b1c3fc3c55473bdfc2def86384d5d19))
* **core:** add buffering indicator component ([#527](https://github.com/videojs/v10/issues/527)) ([aa0fb7c](https://github.com/videojs/v10/commit/aa0fb7ca704843dd6ac8b0b18d9e35f8f430311e))
* **core:** add controls component with activity tracking ([#514](https://github.com/videojs/v10/issues/514)) ([90d881c](https://github.com/videojs/v10/commit/90d881cec21d7f5e1e619061727e6c8d1ff48296))
* **core:** add fullscreen button component ([#459](https://github.com/videojs/v10/issues/459)) ([3c4152f](https://github.com/videojs/v10/commit/3c4152fb5845965334cfd7e3c2623ac978377d96))
* **core:** add mute button component ([#455](https://github.com/videojs/v10/issues/455)) ([aa189ee](https://github.com/videojs/v10/commit/aa189eec84482afde4dd42fc547af4759ea51742))
* **core:** add pip button component ([#525](https://github.com/videojs/v10/issues/525)) ([2c8b77a](https://github.com/videojs/v10/commit/2c8b77af4547b0a8af27abcc419f7d4dff3b005a))
* **core:** add play button component ([#383](https://github.com/videojs/v10/issues/383)) ([9cfab26](https://github.com/videojs/v10/commit/9cfab264d85ea5b8e20fc2d020171ba5ef53b0f4))
* **core:** add player target and feature selectors ([#371](https://github.com/videojs/v10/issues/371)) ([1bde6e9](https://github.com/videojs/v10/commit/1bde6e950a6024769cf63d04c66d1646fd31cc98))
* **core:** add poster component ([#457](https://github.com/videojs/v10/issues/457)) ([c9ba1e1](https://github.com/videojs/v10/commit/c9ba1e1bfc83e02981a2ffad0a0f247092068687))
* **core:** add presentation feature ([#458](https://github.com/videojs/v10/issues/458)) ([d5e5cec](https://github.com/videojs/v10/commit/d5e5cec6ab2f81275f488dcaa66edef573ce10bf))
* **core:** add seek button component ([#526](https://github.com/videojs/v10/issues/526)) ([c733077](https://github.com/videojs/v10/commit/c733077d324b3cd40eab7c0e33f1f73592609515))
* **core:** add slider dom ([#613](https://github.com/videojs/v10/issues/613)) ([4c7d287](https://github.com/videojs/v10/commit/4c7d287d357e1f1b820aca62b0a26eda225c441f))
* **core:** add time display component ([#460](https://github.com/videojs/v10/issues/460)) ([7b8bc11](https://github.com/videojs/v10/commit/7b8bc11f9f90684269b6acebeb79677063112e1f))
* **core:** dom media slices ([#292](https://github.com/videojs/v10/issues/292)) ([47659f5](https://github.com/videojs/v10/commit/47659f5352634ef094b9ab83476a59ac1f244115))
* **core:** implement temporal state management for time-based media controls ([1e12f66](https://github.com/videojs/v10/commit/1e12f66f16eedfe13af17ccfabca7ab0e8239313))
* **example/react:** improvements to react examples ([#210](https://github.com/videojs/v10/issues/210)) ([c35b012](https://github.com/videojs/v10/commit/c35b0122509ce3230dcfce4a0acf0d315ba5f0ee))
* **html:** reorganize import paths by use case ([#480](https://github.com/videojs/v10/issues/480)) ([870cbb7](https://github.com/videojs/v10/commit/870cbb77e4ac45d179d8702d0e08c58face8a2fc))
* **html:** setup player api ([#374](https://github.com/videojs/v10/issues/374)) ([a419f5e](https://github.com/videojs/v10/commit/a419f5ef190a47575c4a7e11353a5454e6ee7fe6))
* **icons:** add fullscreen enter and exit icons ([29ed5e3](https://github.com/videojs/v10/commit/29ed5e37593d7b5b40dba36bbadac5eed71c2710))
* **icons:** implement shared SVG icon system across packages ([e0be58e](https://github.com/videojs/v10/commit/e0be58e094e65ea72af99b2c1e1d87c507c251bd))
* implement current time display components ([5bd0a15](https://github.com/videojs/v10/commit/5bd0a154dbba01d2a5d11eb1f548fe4baa581675))
* initialize Video.js 10 monorepo with core architecture ([4b0d84e](https://github.com/videojs/v10/commit/4b0d84e9c8adfa7401084389da5deb751420b629))
* **media-store,html,react:** implement TimeRange component with hook-style architecture ([c29fd2c](https://github.com/videojs/v10/commit/c29fd2c2c1edd61c09a6683041c709a990d8a6f0))
* **media-store:** add comprehensive time formatting utilities ([7e26e54](https://github.com/videojs/v10/commit/7e26e547ea0b98c6366d6cf1b3800b5f253767a7))
* **media-store:** add duration display component state definition ([d0036fc](https://github.com/videojs/v10/commit/d0036fc7d68b4e50c5c7af863105900f20bee12c))
* **media-store:** add fullscreen button component state definition ([e19b98b](https://github.com/videojs/v10/commit/e19b98b1200f80f5303b4c8a76948254c95a8c81))
* **media-store:** add fullscreen state mediator with shadow DOM support ([7f243c2](https://github.com/videojs/v10/commit/7f243c22d85f45c5f7a88e3638f03ce774667d20))
* migrate entire monorepo from tsc to tsup for production builds ([7403cc7](https://github.com/videojs/v10/commit/7403cc728119322888e527468a07a7634f43b32a))
* **monorepo:** migrate prototype code to organized package structure ([4b472ec](https://github.com/videojs/v10/commit/4b472ec49cd91f0af61cb5aaa039d428982d3b91))
* **packages:** add slider core layer ([#529](https://github.com/videojs/v10/issues/529)) ([7efee3d](https://github.com/videojs/v10/commit/7efee3d03361f195706257b4950708cbe5356cf5))
* **react-icons:** implement SVGR-powered auto-generation with full styling support ([6fcb18f](https://github.com/videojs/v10/commit/6fcb18f1d2b108990025f8ea67b3a31e17879d49))
* **react:** implement default and minimal video skins ([#550](https://github.com/videojs/v10/issues/550)) ([7d3be36](https://github.com/videojs/v10/commit/7d3be367f5b31b8a6d5b9a9e3c87245f95b8e22a))
* **react:** implement video skins with responsive layout ([#568](https://github.com/videojs/v10/issues/568)) ([846d38e](https://github.com/videojs/v10/commit/846d38e79b11ba8de62bdb239bc1358e9abc28de))
* rename range to slider ([#46](https://github.com/videojs/v10/issues/46)) ([9c6eaef](https://github.com/videojs/v10/commit/9c6eaef2aa61771ae1407d0a594b3f790e0ff665))
* **site:** add util reference pipeline ([#537](https://github.com/videojs/v10/issues/537)) ([78112fb](https://github.com/videojs/v10/commit/78112fbefdaace678a2d1335409e40533f3819fa))
* **site:** generated multipart component api reference ([#468](https://github.com/videojs/v10/issues/468)) ([4b1e863](https://github.com/videojs/v10/commit/4b1e863883f730f561a490e58223d8298b5bef5c))
* **store:** lit bindings ([#289](https://github.com/videojs/v10/issues/289)) ([648aae7](https://github.com/videojs/v10/commit/648aae7e31db02f6d69dba138b98e7cbfd398902))
* **ui:** micro icons, toasted design tweaks ([#52](https://github.com/videojs/v10/issues/52)) ([bd3f0f7](https://github.com/videojs/v10/commit/bd3f0f7510480125653506d8e2e560234f6c06f2))
* **ui:** port over default skin ([ff4ea36](https://github.com/videojs/v10/commit/ff4ea3693e63ab3b5a728988ca44f3bab669e8ff))
* **ui:** port over default skin ([9950945](https://github.com/videojs/v10/commit/995094500823e1063e7ae291c9a2ea9a4aa74847))
* **ui:** skin and icon tweaks ([#59](https://github.com/videojs/v10/issues/59)) ([cdebece](https://github.com/videojs/v10/commit/cdebece1ebe8e5160b90e49ac2cbf05a7e0b6dca))


### Bug Fixes

* add popover core, use in html and improve factory ([#204](https://github.com/videojs/v10/issues/204)) ([f3b1b19](https://github.com/videojs/v10/commit/f3b1b199173f3750bc05ad9063fcccbd4163b12b))
* clean up core, less seams in wrappers ([#197](https://github.com/videojs/v10/issues/197)) ([601a5a3](https://github.com/videojs/v10/commit/601a5a37939605ca38f81a825fd02934e7928c39))
* Clean up more typescript errors. ([87105db](https://github.com/videojs/v10/commit/87105db6be31038fc92862c240898984d02932eb))
* **core:** fix circular import and simplify media types ([#569](https://github.com/videojs/v10/issues/569)) ([38b3a8f](https://github.com/videojs/v10/commit/38b3a8f55ca96938db92fa06c0d171bf544ffe3b))
* **core:** fixed fullscreen on ios safari ([#211](https://github.com/videojs/v10/issues/211)) ([6068633](https://github.com/videojs/v10/commit/6068633be0939c8024317abac0cb1cd5a262d07a))
* **core:** preserve user props in time slider ([#621](https://github.com/videojs/v10/issues/621)) ([23528ca](https://github.com/videojs/v10/commit/23528cad88fe1645df686d4cd74eaf4806a35d6a))
* **core:** update README to use v10 terminology ([93dd266](https://github.com/videojs/v10/commit/93dd266f551923e103111019e12834f27cefabe7))
* design tweaks to toasted skin, lint rule tweaks ([#44](https://github.com/videojs/v10/issues/44)) ([3a0767c](https://github.com/videojs/v10/commit/3a0767c3407b2d6d8af3d3a8afd57b1e76efda85))
* enable eslint & run eslint:fix ([#43](https://github.com/videojs/v10/issues/43)) ([5cb93a1](https://github.com/videojs/v10/commit/5cb93a14a7f47d66d5c71f9b82867621beda236c))
* **html:** discover media elements and attach store target via DOM ([#481](https://github.com/videojs/v10/issues/481)) ([5eab1db](https://github.com/videojs/v10/commit/5eab1dbb2fbb906543f7749e5956c9791c30be34))
* **icons:** add currentColor fill to fullscreen icons for proper theming ([d0d4876](https://github.com/videojs/v10/commit/d0d487601eb2da669be9a83cc8201d94998ec334))
* **media-store:** replace tsup with rollup for consistent build tooling ([77c2932](https://github.com/videojs/v10/commit/77c2932b8d504a3c66e0af3badf3b1332d5d92c0))
* **media-store:** resolve TypeScript declaration generation build issues ([d8809c5](https://github.com/videojs/v10/commit/d8809c5abe066a39a14b423be239fe7c0c234632))
* **media-store:** resolve TypeScript error in dispatch method ([3fd26eb](https://github.com/videojs/v10/commit/3fd26eb6544809d6a3e00a45e916f5e9fd61ae2a))
* **media:** use explicit exports to resolve React package TypeScript errors ([4662dbc](https://github.com/videojs/v10/commit/4662dbcbb1811293c98c803f8057a2534114d4ea))
* minimal volume slider bug & fix dev infinite bug ([#73](https://github.com/videojs/v10/issues/73)) ([591dab6](https://github.com/videojs/v10/commit/591dab66caf8829017688007320f92b7445c4baa))
* **packages:** enable unbundle mode to avoid mangled exports ([00fdf96](https://github.com/videojs/v10/commit/00fdf966ca5148bcca303058dd798b1b880896e0))
* **packages:** update version badges ([#138](https://github.com/videojs/v10/issues/138)) ([22d9cb6](https://github.com/videojs/v10/commit/22d9cb64f2e5b9601a2039bb166dbe3fee6a1b3e))
* resolve package dependency and TypeScript export issues ([7154b1e](https://github.com/videojs/v10/commit/7154b1e44674a61735ab0f393a8bed3fcc689f8d))
* resolve TypeScript build errors across packages ([374db7a](https://github.com/videojs/v10/commit/374db7afc07d6211bfd3f8079bbcd9613f3b69f3))
* **root:** add videojs keyword to package.json ([4a9f8b2](https://github.com/videojs/v10/commit/4a9f8b2ad6fb27b463dcfe8d1a5fd883c9fa21d1))
* seek jump back to current time ([#22](https://github.com/videojs/v10/issues/22)) ([a3f9630](https://github.com/videojs/v10/commit/a3f9630bd1eb34a16f339ffd30071b8adc864ca0))
* **site:** update discord link ([#170](https://github.com/videojs/v10/issues/170)) ([bb10294](https://github.com/videojs/v10/commit/bb10294419439fb02df650f3e7f7c5496ecc3a73))
* **time-display:** clean up time utilities and simplify components ([597e79d](https://github.com/videojs/v10/commit/597e79d7fc12737353c8c9eb3f6e77ef0a04e9ed))
* **typescript:** resolve declaration file generation for rollup packages ([#1](https://github.com/videojs/v10/issues/1)) ([69670e8](https://github.com/videojs/v10/commit/69670e8d7134db34aee665d8871cd17901625915))
* use popover core in react popover ([#208](https://github.com/videojs/v10/issues/208)) ([99fef78](https://github.com/videojs/v10/commit/99fef78f63e8dd121513b9cd20696a7d35603837))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-alpha.1
