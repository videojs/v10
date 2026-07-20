# Changelog

## [10.0.0-beta.25](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.24...@videojs/skins@10.0.0-beta.25) (2026-07-07)


### Features

* **packages:** add poster placeholder blur-up pattern ([#1632](https://github.com/videojs/v10/issues/1632)) ([0742851](https://github.com/videojs/v10/commit/07428519a5a183061a2be561bb63ecdb7e15907b))
* **packages:** add quality menu UI ([#1694](https://github.com/videojs/v10/issues/1694)) ([16ab909](https://github.com/videojs/v10/commit/16ab90987ac1629735310649faca62ad36d61526))
* **packages:** add settings menu ([#1615](https://github.com/videojs/v10/issues/1615)) ([00b6f0b](https://github.com/videojs/v10/commit/00b6f0be1d89f7c4c001a539ee2962888448c8c4))
* **packages:** add time display toggle ([#1669](https://github.com/videojs/v10/issues/1669)) ([be4d5a1](https://github.com/videojs/v10/commit/be4d5a11550d6cc599a7ac491a9422ee923511b4))
* **packages:** airplay button ([#1531](https://github.com/videojs/v10/issues/1531)) ([338020e](https://github.com/videojs/v10/commit/338020e1d5a2289f50f92237ff9e8db0457682e4))
* **packages:** compound tooltips with label and shortcut parts ([#1494](https://github.com/videojs/v10/issues/1494)) ([035b509](https://github.com/videojs/v10/commit/035b509c7a77e74153ea5b36536fce424ce27d2d))
* **skin:** show scrubber preview timestamps ([#1652](https://github.com/videojs/v10/issues/1652)) ([7453d53](https://github.com/videojs/v10/commit/7453d538a8d25e56fd288ef64fc0af901250e459))


### Bug Fixes

* **packages:** fix ejected skin slider setup ([#1660](https://github.com/videojs/v10/issues/1660)) ([3d2225e](https://github.com/videojs/v10/commit/3d2225e77e95b9edeefbeab24da67eebd7f94dd3))
* **skin:** add missing classnames to tailwind menus ([#1712](https://github.com/videojs/v10/issues/1712)) ([ff694a0](https://github.com/videojs/v10/commit/ff694a0dd81426576b14d99f3113853668afe4cb))
* **skin:** aspect ratio related fixes ([#1726](https://github.com/videojs/v10/issues/1726)) ([a6d30a9](https://github.com/videojs/v10/commit/a6d30a9e6176bf806aa1ea02e36578758e3eee49))
* **skin:** improve buffering, overlays, and input feedback ([#1547](https://github.com/videojs/v10/issues/1547)) ([0de3fef](https://github.com/videojs/v10/commit/0de3fef878fcb9f8167776a2c1011d134989da93))
* **skin:** improvements to menu styles ([#1725](https://github.com/videojs/v10/issues/1725)) ([f3652bd](https://github.com/videojs/v10/commit/f3652bd90be293268449295f96439a465b7a1bc3))
* **skin:** minor design tweaks ([#1597](https://github.com/videojs/v10/issues/1597)) ([23c6224](https://github.com/videojs/v10/commit/23c622444655745cbaed0e92a573fabb66fdc855))
* **skin:** prevent initial pause icon flash ([#1622](https://github.com/videojs/v10/issues/1622)) ([996239e](https://github.com/videojs/v10/commit/996239e029928b5d70e787badfdd6c07a4889927))
* **skin:** restore overflow on audio skins ([#1623](https://github.com/videojs/v10/issues/1623)) ([93c92ff](https://github.com/videojs/v10/commit/93c92ff6464016447c634673ee1ab2fdc6130903))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.25

## [10.0.0-beta.24](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.23...@videojs/skins@10.0.0-beta.24) (2026-05-19)


### Features

* **packages:** add live button component ([#1473](https://github.com/videojs/v10/issues/1473)) ([e37d5df](https://github.com/videojs/v10/commit/e37d5df87352088a9287bd46b14759965c154b76))
* **packages:** add playback rate menu ([#1527](https://github.com/videojs/v10/issues/1527)) ([ad831d2](https://github.com/videojs/v10/commit/ad831d25f00187929e6eed93770422fa7003071c))
* **packages:** add UI support for gestures and hotkeys ([#1388](https://github.com/videojs/v10/issues/1388)) ([0620814](https://github.com/videojs/v10/commit/0620814a6726da5705b28b1e576dfa3a49b92108))


### Bug Fixes

* **ci:** use biome to sort CSS properties ([#1490](https://github.com/videojs/v10/issues/1490)) ([8e2b7e4](https://github.com/videojs/v10/commit/8e2b7e4f6d20a0b4f780c34ec2670ec1f9bd25e6))
* **icons:** avoid hidden spinner animations ([#1476](https://github.com/videojs/v10/issues/1476)) ([c388dd3](https://github.com/videojs/v10/commit/c388dd35a96465d6b2c340fdb68cf1eede36418a))
* **skin:** fix minimal tailwind root sizing ([#1540](https://github.com/videojs/v10/issues/1540)) ([e73f87d](https://github.com/videojs/v10/commit/e73f87d39257a43c9d4ed6c097e58f9e699c9278))
* **skin:** fix safari button alignment issue when zoomed ([#1495](https://github.com/videojs/v10/issues/1495)) ([c5b06cf](https://github.com/videojs/v10/commit/c5b06cf948c5f432f2288c8a931238bb2a150e1a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.24

## [10.0.0-beta.23](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.22...@videojs/skins@10.0.0-beta.23) (2026-04-27)


### ⚠ BREAKING CHANGES

* **packages:** rename cast to google-cast and remote-playback ([#1380](https://github.com/videojs/v10/issues/1380))

### Code Refactoring

* **packages:** rename cast to google-cast and remote-playback ([#1380](https://github.com/videojs/v10/issues/1380)) ([413874c](https://github.com/videojs/v10/commit/413874c1e079ccfa43067180161fe86c78b185bd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.23

## [10.0.0-beta.22](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.21...@videojs/skins@10.0.0-beta.22) (2026-04-18)


### Features

* **packages:** add chromecast support via remote playback API ([#1348](https://github.com/videojs/v10/issues/1348)) ([31a005e](https://github.com/videojs/v10/commit/31a005eeef4cee496c15f6f6be0129ef0006a5a8))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.22

## [10.0.0-beta.21](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.20...@videojs/skins@10.0.0-beta.21) (2026-04-14)


### Miscellaneous Chores

* **@videojs/skins:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.21

## [10.0.0-beta.20](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.19...@videojs/skins@10.0.0-beta.20) (2026-04-14)


### Miscellaneous Chores

* **@videojs/skins:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.20

## [10.0.0-beta.19](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.18...@videojs/skins@10.0.0-beta.19) (2026-04-14)


### Miscellaneous Chores

* **@videojs/skins:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.19

## [10.0.0-beta.18](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.17...@videojs/skins@10.0.0-beta.18) (2026-04-14)


### Miscellaneous Chores

* **@videojs/skins:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.18

## [10.0.0-beta.17](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.16...@videojs/skins@10.0.0-beta.17) (2026-04-11)


### Miscellaneous Chores

* **@videojs/skins:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.17

## [10.0.0-beta.16](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.15...@videojs/skins@10.0.0-beta.16) (2026-04-10)


### Features

* **packages:** add hotkey bindings to preset skins ([#1264](https://github.com/videojs/v10/issues/1264)) ([9912a8e](https://github.com/videojs/v10/commit/9912a8e7593dc9f26c6dfe5cd8ddca34ef89a8ef))


### Bug Fixes

* **packages:** time slider seek improvements ([#1291](https://github.com/videojs/v10/issues/1291)) ([b934c58](https://github.com/videojs/v10/commit/b934c589f824b0ed7338b19c2b3bad3160742e74))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.16

## [10.0.0-beta.15](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.14...@videojs/skins@10.0.0-beta.15) (2026-04-03)


### Miscellaneous Chores

* **@videojs/skins:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.15

## [10.0.0-beta.14](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.13...@videojs/skins@10.0.0-beta.14) (2026-04-03)


### Features

* **html:** add ui bundles for eject ([#1206](https://github.com/videojs/v10/issues/1206)) ([0ed7bf0](https://github.com/videojs/v10/commit/0ed7bf0653b373a353c039fac1aa2bca4fa2973e))


### Bug Fixes

* **packages:** make tooltips visual-only and auto-forward media button labels ([#1174](https://github.com/videojs/v10/issues/1174)) ([86cf3e8](https://github.com/videojs/v10/commit/86cf3e8977719fbbdcd59244a543fdd8412c4484))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.14

## [10.0.0-beta.13](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.12...@videojs/skins@10.0.0-beta.13) (2026-04-01)


### Miscellaneous Chores

* **@videojs/skins:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.13

## [10.0.0-beta.12](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.11...@videojs/skins@10.0.0-beta.12) (2026-04-01)


### Features

* add Mux video component ([#1036](https://github.com/videojs/v10/issues/1036)) ([271a8c8](https://github.com/videojs/v10/commit/271a8c850216bd1654baaa26f8bb2f5eda56be37))
* **packages:** error dialog component ([#1077](https://github.com/videojs/v10/issues/1077)) ([3430fe1](https://github.com/videojs/v10/commit/3430fe1a493e4bee34f03112206a0cb3cf9d88cf))


### Bug Fixes

* **skin:** responsive design fixes and improvements ([#1129](https://github.com/videojs/v10/issues/1129)) ([1082693](https://github.com/videojs/v10/commit/10826932be7861ebf5df8c66db7811c0510339f4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.12

## [10.0.0-beta.11](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.10...@videojs/skins@10.0.0-beta.11) (2026-03-24)


### Miscellaneous Chores

* **@videojs/skins:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.11

## [10.0.0-beta.10](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.9...@videojs/skins@10.0.0-beta.10) (2026-03-23)


### Bug Fixes

* **skin:** fix button text alignment and text shadow ([#1091](https://github.com/videojs/v10/issues/1091)) ([4af0f66](https://github.com/videojs/v10/commit/4af0f664625f3158c25788b96ef175f6866293a9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.10

## [10.0.0-beta.9](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.8...@videojs/skins@10.0.0-beta.9) (2026-03-23)


### Features

* **skin:** add error handling for audio players ([#1048](https://github.com/videojs/v10/issues/1048)) ([df927f6](https://github.com/videojs/v10/commit/df927f67fcbd0aaa229b1a8e205ab3cb08f7a42d))


### Bug Fixes

* **skin:** extract transition properties into CSS custom properties ([#1075](https://github.com/videojs/v10/issues/1075)) ([657e711](https://github.com/videojs/v10/commit/657e7111b423ac2d2a1d0c6422b88297f40e2b04))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.9

## [10.0.0-beta.8](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.7...@videojs/skins@10.0.0-beta.8) (2026-03-20)


### Miscellaneous Chores

* **@videojs/skins:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.8

## [10.0.0-beta.7](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.6...@videojs/skins@10.0.0-beta.7) (2026-03-19)


### Features

* **packages:** add poster component to video skins ([#994](https://github.com/videojs/v10/issues/994)) ([59bbf6c](https://github.com/videojs/v10/commit/59bbf6c20924ec04e559fe23cbc1a0ad8c8ca080))
* **skin:** add --media-color-primary customization ([#957](https://github.com/videojs/v10/issues/957)) ([0e9f537](https://github.com/videojs/v10/commit/0e9f5376e1756b66a06bfa7ece33d03f5526f927))
* **skin:** add pip-enter and pip-exit icons ([#1015](https://github.com/videojs/v10/issues/1015)) ([81781ca](https://github.com/videojs/v10/commit/81781ca5854f4943b533073b1875b127308a5419))


### Bug Fixes

* **skin:** add subtle control transitions on touch devices ([#985](https://github.com/videojs/v10/issues/985)) ([7e0827c](https://github.com/videojs/v10/commit/7e0827c330dc796aa0375cd5839fc4fc1661f055))
* **skin:** bake in safari layout fix into skins ([#954](https://github.com/videojs/v10/issues/954)) ([177bd26](https://github.com/videojs/v10/commit/177bd26c1fae2ff436e614a87614841a07b836fd))
* **skin:** fixes for react poster image alignment ([#1003](https://github.com/videojs/v10/issues/1003)) ([5c7cafc](https://github.com/videojs/v10/commit/5c7cafca9b7bf08c0d555c76bccb9630c2e3e9a9))
* **skin:** hide volume popover when volume control is unsupported ([#1025](https://github.com/videojs/v10/issues/1025)) ([c09dbdd](https://github.com/videojs/v10/commit/c09dbdd121f2b8bb01e42d79350bf7a7acf09f28))
* **skin:** remove overflow in minimal video skin ([#993](https://github.com/videojs/v10/issues/993)) ([89d9e15](https://github.com/videojs/v10/commit/89d9e15bb3a3c6328920693387bed4a4c2607368))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.7

## [10.0.0-beta.6](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.5...@videojs/skins@10.0.0-beta.6) (2026-03-15)


### Features

* add slider preview thumbnails ([#935](https://github.com/videojs/v10/issues/935)) ([e3f438e](https://github.com/videojs/v10/commit/e3f438e9f488f41c8cf51c95507bc41fc5b524d0))


### Bug Fixes

* add popover and tooltip safe areas ([#951](https://github.com/videojs/v10/issues/951)) ([c39b1f8](https://github.com/videojs/v10/commit/c39b1f8809c235d3ce1c9a083cf3252db17bcfa7))
* **html:** simplify styles for slotted video ([#953](https://github.com/videojs/v10/issues/953)) ([d6e471a](https://github.com/videojs/v10/commit/d6e471a8377e9ee8ef63df9097810c6d0c1bb2f9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.6

## [10.0.0-beta.5](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.4...@videojs/skins@10.0.0-beta.5) (2026-03-12)


### Features

* **react:** add alert dialog to video skin ([#747](https://github.com/videojs/v10/issues/747)) ([5dfc67e](https://github.com/videojs/v10/commit/5dfc67ed02d92512b500c4461898050988e291a8))
* **skin:** add audio skins for HTML and React presets ([#772](https://github.com/videojs/v10/issues/772)) ([d751fda](https://github.com/videojs/v10/commit/d751fdabea9782b9f6c73aaebfb93ed393e488f7))
* **skin:** implement default and minimal skins for HTML player ([#698](https://github.com/videojs/v10/issues/698)) ([c5cafae](https://github.com/videojs/v10/commit/c5cafae57ff34d13f79d11862b82f10414bdcd40))
* **skin:** port tooltip styling from tech preview ([#800](https://github.com/videojs/v10/issues/800)) ([6b6566e](https://github.com/videojs/v10/commit/6b6566e2540b4ad9fcd9b2a8e6c767f5f7e4072f))


### Bug Fixes

* **html:** fix html container sizing ([#881](https://github.com/videojs/v10/issues/881)) ([abf8753](https://github.com/videojs/v10/commit/abf8753fe61430122c9d3df40e559ecff3aef3c3))
* **skin:** add missing tooltip provider/group ([#902](https://github.com/videojs/v10/issues/902)) ([1dbcd79](https://github.com/videojs/v10/commit/1dbcd79e541fce77021645d012fb3554d241b16b))
* **skin:** fix fullscreen video clipping and border-radius handling ([#905](https://github.com/videojs/v10/issues/905)) ([e9621a1](https://github.com/videojs/v10/commit/e9621a1f509b74c6801bb02bb8307fba9f317f4c))
* **skin:** only set poster object-fit: contain in fullscreen ([#906](https://github.com/videojs/v10/issues/906)) ([b676517](https://github.com/videojs/v10/commit/b6765179939f9410d822459fec6706828b7016da))
* **skin:** scope controls transitions to fine pointer only ([#909](https://github.com/videojs/v10/issues/909)) ([7a69bf4](https://github.com/videojs/v10/commit/7a69bf44891e2c5a478e2241168a276b9d61ac34))
* **skins:** remove legacy caption markup artifacts ([#882](https://github.com/videojs/v10/issues/882)) ([85266ba](https://github.com/videojs/v10/commit/85266bab3b5b01a6cf6d769a16f662bffa57c208))
* **skin:** standardize backdrop-filter and fix minimal root sizing ([#895](https://github.com/videojs/v10/issues/895)) ([464d5e5](https://github.com/videojs/v10/commit/464d5e5fa2e65c0b3f7f04064cc9f987bfcb967d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.5
