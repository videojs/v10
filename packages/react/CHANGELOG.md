# Changelog

## [0.1.0-preview.11](https://github.com/videojs/v10/compare/@videojs/react@0.1.0-preview.10...@videojs/react@0.1.0-preview.11) (2026-02-20)


### Features

* add background video components ([#567](https://github.com/videojs/v10/issues/567)) ([fd14f0c](https://github.com/videojs/v10/commit/fd14f0cb17c2fd1752c82d29252296492ed1568f))
* add media API + HLS video components ([#507](https://github.com/videojs/v10/issues/507)) ([b3a31a3](https://github.com/videojs/v10/commit/b3a31a335a363d3a96b510206b57d1bb9ebb8edd))
* **core:** add buffering indicator component ([#527](https://github.com/videojs/v10/issues/527)) ([aa0fb7c](https://github.com/videojs/v10/commit/aa0fb7ca704843dd6ac8b0b18d9e35f8f430311e))
* **core:** add controls component with activity tracking ([#514](https://github.com/videojs/v10/issues/514)) ([90d881c](https://github.com/videojs/v10/commit/90d881cec21d7f5e1e619061727e6c8d1ff48296))
* **core:** add fullscreen button component ([#459](https://github.com/videojs/v10/issues/459)) ([3c4152f](https://github.com/videojs/v10/commit/3c4152fb5845965334cfd7e3c2623ac978377d96))
* **core:** add mute button component ([#455](https://github.com/videojs/v10/issues/455)) ([aa189ee](https://github.com/videojs/v10/commit/aa189eec84482afde4dd42fc547af4759ea51742))
* **core:** add pip button component ([#525](https://github.com/videojs/v10/issues/525)) ([2c8b77a](https://github.com/videojs/v10/commit/2c8b77af4547b0a8af27abcc419f7d4dff3b005a))
* **core:** add play button component ([#383](https://github.com/videojs/v10/issues/383)) ([9cfab26](https://github.com/videojs/v10/commit/9cfab264d85ea5b8e20fc2d020171ba5ef53b0f4))
* **core:** add poster component ([#457](https://github.com/videojs/v10/issues/457)) ([c9ba1e1](https://github.com/videojs/v10/commit/c9ba1e1bfc83e02981a2ffad0a0f247092068687))
* **core:** add seek button component ([#526](https://github.com/videojs/v10/issues/526)) ([c733077](https://github.com/videojs/v10/commit/c733077d324b3cd40eab7c0e33f1f73592609515))
* **core:** add time display component ([#460](https://github.com/videojs/v10/issues/460)) ([7b8bc11](https://github.com/videojs/v10/commit/7b8bc11f9f90684269b6acebeb79677063112e1f))
* **example/react:** improvements to react examples ([#210](https://github.com/videojs/v10/issues/210)) ([c35b012](https://github.com/videojs/v10/commit/c35b0122509ce3230dcfce4a0acf0d315ba5f0ee))
* **html:** setup player api ([#374](https://github.com/videojs/v10/issues/374)) ([a419f5e](https://github.com/videojs/v10/commit/a419f5ef190a47575c4a7e11353a5454e6ee7fe6))
* **react:** add captions styling to video skins ([#582](https://github.com/videojs/v10/issues/582)) ([b78c6ce](https://github.com/videojs/v10/commit/b78c6ce7b1942cd00b737059f19bb37dc7585bec))
* **react:** add video component and utility hooks ([#293](https://github.com/videojs/v10/issues/293)) ([a71a280](https://github.com/videojs/v10/commit/a71a280bdc0299cd78eaa200be4784f6a7720f14))
* **react:** implement default and minimal video skins ([#550](https://github.com/videojs/v10/issues/550)) ([7d3be36](https://github.com/videojs/v10/commit/7d3be367f5b31b8a6d5b9a9e3c87245f95b8e22a))
* **react:** implement video skins with responsive layout ([#568](https://github.com/videojs/v10/issues/568)) ([846d38e](https://github.com/videojs/v10/commit/846d38e79b11ba8de62bdb239bc1358e9abc28de))
* **react:** initial skin scaffolding ([#523](https://github.com/videojs/v10/issues/523)) ([edefc2a](https://github.com/videojs/v10/commit/edefc2a2d63e2124d0a11a15f44bd7109c6d9788))
* **react:** setup react player api ([#372](https://github.com/videojs/v10/issues/372)) ([d28dda1](https://github.com/videojs/v10/commit/d28dda114c10d99334a0ec2ffe3c1406aec9eefb))
* **site:** add buffering indicator api reference ([84b7b07](https://github.com/videojs/v10/commit/84b7b0774a1fb655f4cb7f6a87e589097a661685)), closes [#532](https://github.com/videojs/v10/issues/532) [#533](https://github.com/videojs/v10/issues/533)
* **store:** add reactive state primitives ([#311](https://github.com/videojs/v10/issues/311)) ([beb8615](https://github.com/videojs/v10/commit/beb8615c1c75a996d1e4ea2db804c49acdc10ef0))
* **store:** skin store setup ([#298](https://github.com/videojs/v10/issues/298)) ([b2e2b88](https://github.com/videojs/v10/commit/b2e2b88e19634fa67e064b898e37f954d6939e2a))


### Bug Fixes

* **core:** fix circular import and simplify media types ([#569](https://github.com/videojs/v10/issues/569)) ([38b3a8f](https://github.com/videojs/v10/commit/38b3a8f55ca96938db92fa06c0d171bf544ffe3b))
* **html:** discover media elements and attach store target via DOM ([#481](https://github.com/videojs/v10/issues/481)) ([5eab1db](https://github.com/videojs/v10/commit/5eab1dbb2fbb906543f7749e5956c9791c30be34))
* **packages:** enable unbundle mode to avoid mangled exports ([00fdf96](https://github.com/videojs/v10/commit/00fdf966ca5148bcca303058dd798b1b880896e0))
* **site:** resolve aliased part descriptions in api docs ([#518](https://github.com/videojs/v10/issues/518)) ([8294404](https://github.com/videojs/v10/commit/82944041f903ead4bb8afbce35fbfb7977caa23b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/core bumped to 0.1.0-preview.11
    * @videojs/icons bumped to 0.1.0-preview.11
    * @videojs/utils bumped to 0.1.0-preview.11
