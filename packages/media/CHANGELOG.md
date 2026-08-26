# Changelog

## [10.0.0-beta.32](https://github.com/videojs/v10/compare/@videojs/media@10.0.0-beta.31...@videojs/media@10.0.0-beta.32) (2026-08-26)


### Bug Fixes

* **media:** make engine entries server importable ([#2429](https://github.com/videojs/v10/issues/2429)) ([38cd16c](https://github.com/videojs/v10/commit/38cd16c59b4c19042013a82c64e402e5cbbeafbb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.32

## [10.0.0-beta.31](https://github.com/videojs/v10/compare/@videojs/media@10.0.0-beta.30...@videojs/media@10.0.0-beta.31) (2026-08-21)


### Miscellaneous Chores

* **@videojs/media:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.31

## [10.0.0-beta.30](https://github.com/videojs/v10/compare/@videojs/media@10.0.0-beta.29...@videojs/media@10.0.0-beta.30) (2026-08-20)


### Features

* **media:** bring the shaka media to parity with the hls.js media ([#2285](https://github.com/videojs/v10/issues/2285)) ([d9e92af](https://github.com/videojs/v10/commit/d9e92af48c2d52378794991884f826023e601874))
* **packages:** add shaka player media ([#2276](https://github.com/videojs/v10/issues/2276)) ([c5895ec](https://github.com/videojs/v10/commit/c5895ecb0887369badffb19d4798207185c02e4e))


### Bug Fixes

* **packages:** load posters and storyboard thumbnails in cross-origin-isolated pages ([#2273](https://github.com/videojs/v10/issues/2273)) ([459fddb](https://github.com/videojs/v10/commit/459fddb7282770963bd28d42ed6c7a572845b88b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.30

## [10.0.0-beta.29](https://github.com/videojs/v10/compare/@videojs/media@10.0.0-beta.28...@videojs/media@10.0.0-beta.29) (2026-08-19)


### ⚠ BREAKING CHANGES

* **packages:** resolve the poster in the store, and set src on img from it ([#2039](https://github.com/videojs/v10/issues/2039))
* **packages:** name the resolved title `title`, and take it from config only ([#2176](https://github.com/videojs/v10/issues/2176))

### Features

* **packages:** make Mux and Vimeo content-data donors ([#1998](https://github.com/videojs/v10/issues/1998)) ([7940b2c](https://github.com/videojs/v10/commit/7940b2c4030d9582551a335eabc59b9a7979c52b))
* **packages:** name the resolved title `title`, and take it from config only ([#2176](https://github.com/videojs/v10/issues/2176)) ([969cf56](https://github.com/videojs/v10/commit/969cf567b3125e437d8f68982f655ee4255409ae))
* **packages:** resolve the poster in the store, and set src on img from it ([#2039](https://github.com/videojs/v10/issues/2039)) ([7a902db](https://github.com/videojs/v10/commit/7a902db20e9ec335eb27a6cee6aaa6a7c0d0e29d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.29

## [10.0.0-beta.28](https://github.com/videojs/v10/compare/@videojs/media@10.0.0-beta.27...@videojs/media@10.0.0-beta.28) (2026-08-19)


### Features

* **media:** add maxAutoResolution cap to hls.js sources ([#2061](https://github.com/videojs/v10/issues/2061)) ([414513f](https://github.com/videojs/v10/commit/414513f03db856e860a882921927a12e7d57c470))
* **media:** cap hls.js renditions to the player size ([#2243](https://github.com/videojs/v10/issues/2243)) ([e5dd81a](https://github.com/videojs/v10/commit/e5dd81ad6c255a0203a731a03985e44c91ae1bc3))


### Bug Fixes

* **packages:** make the TikTok embed answer the player's controls ([#2218](https://github.com/videojs/v10/issues/2218)) ([0882e1a](https://github.com/videojs/v10/commit/0882e1a232da5438a312ac09ba522d7eb489573f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.28

## [10.0.0-beta.27](https://github.com/videojs/v10/compare/@videojs/media@10.0.0-beta.26...@videojs/media@10.0.0-beta.27) (2026-08-17)


### ⚠ BREAKING CHANGES

* **spf:** add the SPF-backed Mux Media, elements, and components ([#2045](https://github.com/videojs/v10/issues/2045))
* **packages:** relocate spf media facades ([#2033](https://github.com/videojs/v10/issues/2033))
* **packages:** restructure media source, engine, and Mux image APIs ([#1903](https://github.com/videojs/v10/issues/1903))

### Features

* **media:** support DRM protected native HLS playback ([#2014](https://github.com/videojs/v10/issues/2014)) ([1afed11](https://github.com/videojs/v10/commit/1afed1164c98b341f3104cd287cbc55ae20dc2a4))
* **media:** support DRM protected playback ([#1948](https://github.com/videojs/v10/issues/1948)) ([61dd83b](https://github.com/videojs/v10/commit/61dd83b674a01174dbb43cbbe51fe996eb5895e4))
* **media:** support the video renditions api in dash media ([#2060](https://github.com/videojs/v10/issues/2060)) ([8c186ee](https://github.com/videojs/v10/commit/8c186ee9e8c1a6c971568d0093adcf4fa1dd2dee))
* **packages:** add cloudflare stream media ([#2168](https://github.com/videojs/v10/issues/2168)) ([cfb4b65](https://github.com/videojs/v10/commit/cfb4b6571f0086c557c5b4683c4ced396067a0d2))
* **packages:** add spotify audio media ([#2169](https://github.com/videojs/v10/issues/2169)) ([8993ab1](https://github.com/videojs/v10/commit/8993ab1db3cd4ff7569b29c197efdabd8fd18364))
* **packages:** add tiktok video media ([#2170](https://github.com/videojs/v10/issues/2170)) ([7ff13b4](https://github.com/videojs/v10/commit/7ff13b426d92d5d19aaff8e1d074de05649abf7b))
* **packages:** add twitch video media ([#2171](https://github.com/videojs/v10/issues/2171)) ([cde01ce](https://github.com/videojs/v10/commit/cde01ceabfc090e4b713d30d5b25115a9fbaed63))
* **packages:** add youtube media with html and react components ([#1853](https://github.com/videojs/v10/issues/1853)) ([f7571e3](https://github.com/videojs/v10/commit/f7571e3d1fbfbcabf8cba319fb498bb052afb376))
* **packages:** resolve feature state from user and media values ([#1946](https://github.com/videojs/v10/issues/1946)) ([4751abb](https://github.com/videojs/v10/commit/4751abb75bd6febf5ccbccdd9061379c8f384430))
* **spf:** add the SPF-backed Mux Media, elements, and components ([#2045](https://github.com/videojs/v10/issues/2045)) ([d1d1673](https://github.com/videojs/v10/commit/d1d1673ecd17e1ca1492abc5b396296bb8c7b176))


### Bug Fixes

* **core:** restore the last selected subtitles track on toggle ([#2102](https://github.com/videojs/v10/issues/2102)) ([965b36e](https://github.com/videojs/v10/commit/965b36e9517cee9c9962d19352f1ecb53a57b1d6))
* **media:** announce a cleared source on every embed host ([#2217](https://github.com/videojs/v10/issues/2217)) ([c3cbc13](https://github.com/videojs/v10/commit/c3cbc132257c2344aee032eec72970d1f8bd770f))
* **media:** hook the media's actual playback engine in mux data ([#2040](https://github.com/videojs/v10/issues/2040)) ([501af91](https://github.com/videojs/v10/commit/501af9168c92a3ef757ff6de010c86a495df11f4))
* **media:** keep sideloaded track cues through hls.js resets ([#2119](https://github.com/videojs/v10/issues/2119)) ([874a9aa](https://github.com/videojs/v10/commit/874a9aa84e79a9ef93406c548e7539d726f82cbb))
* **media:** keep the hls audio selection across group switches ([#2120](https://github.com/videojs/v10/issues/2120)) ([847a263](https://github.com/videojs/v10/commit/847a2631d5fd03327c2a21353c35ce899da5bbfc))
* **media:** raise hls.js preload buffer limits without restarting the load ([#2103](https://github.com/videojs/v10/issues/2103)) ([fd9a151](https://github.com/videojs/v10/commit/fd9a151fcd0ba2ea4a01125b9186f2487638bf5f))
* **packages:** build iframe media embeds when the source arrives after attach ([#2118](https://github.com/videojs/v10/issues/2118)) ([b8bffc5](https://github.com/videojs/v10/commit/b8bffc54ab00d731fdf7b9194bc4d50e022059de))
* **packages:** keep controls visible during active interactions ([#1900](https://github.com/videojs/v10/issues/1900)) ([35616db](https://github.com/videojs/v10/commit/35616db5a38d193f1fc114da4af68a79f08093f1))


### Code Refactoring

* **packages:** relocate spf media facades ([#2033](https://github.com/videojs/v10/issues/2033)) ([7ee7fa5](https://github.com/videojs/v10/commit/7ee7fa549777378c5e30cc6c151ab0d501538b83))
* **packages:** restructure media source, engine, and Mux image APIs ([#1903](https://github.com/videojs/v10/issues/1903)) ([99180ff](https://github.com/videojs/v10/commit/99180ff4d5eee9ff9cc3982217fb21877c2e3fd7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.27

## [10.0.0-beta.26](https://github.com/videojs/v10/compare/@videojs/media@10.0.0-beta.25...@videojs/media@10.0.0-beta.26) (2026-08-02)


### ⚠ BREAKING CHANGES

* **packages:** support media components as markup ([#1883](https://github.com/videojs/v10/issues/1883))
* **media:** extract media package from core ([#1879](https://github.com/videojs/v10/issues/1879))

### Features

* **packages:** support media components as markup ([#1883](https://github.com/videojs/v10/issues/1883)) ([68e9607](https://github.com/videojs/v10/commit/68e96079e5264cdb59633f47b543cc21f06a6dba))
* **spf:** expose media tracks on the SPF media adapter ([#1826](https://github.com/videojs/v10/issues/1826)) ([c83b044](https://github.com/videojs/v10/commit/c83b044986bb0a7445a2c54be18ff66cc96e1f66))


### Code Refactoring

* **media:** extract media package from core ([#1879](https://github.com/videojs/v10/issues/1879)) ([75dcc66](https://github.com/videojs/v10/commit/75dcc6675bd19e9be05c4e295830c80c0ca2180f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/spf bumped to 10.0.0-beta.26
    * @videojs/utils bumped to 10.0.0-beta.26

## Changelog
