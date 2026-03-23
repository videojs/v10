# Changelog

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
