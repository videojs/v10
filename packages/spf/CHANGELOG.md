# Changelog

## [10.0.0-beta.9](https://github.com/videojs/v10/compare/@videojs/spf@10.0.0-beta.8...@videojs/spf@10.0.0-beta.9) (2026-03-23)


### Bug Fixes

* **spf:** call sourceBuffer.abort() on AbortError to reset MSE parser state ([#1081](https://github.com/videojs/v10/issues/1081)) ([f5ecc93](https://github.com/videojs/v10/commit/f5ecc93554c054de149fbf3df2d26da49d58e7ec))
* **spf:** implement preload IDL attribute on SpfMedia ([#1069](https://github.com/videojs/v10/issues/1069)) ([04f81a2](https://github.com/videojs/v10/commit/04f81a26e13648ca414f2e51380c8786a06a7724))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.9

## [10.0.0-beta.8](https://github.com/videojs/v10/compare/@videojs/spf@10.0.0-beta.7...@videojs/spf@10.0.0-beta.8) (2026-03-20)


### Miscellaneous Chores

* **@videojs/spf:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.8

## [10.0.0-beta.7](https://github.com/videojs/v10/compare/@videojs/spf@10.0.0-beta.6...@videojs/spf@10.0.0-beta.7) (2026-03-19)


### Miscellaneous Chores

* **@videojs/spf:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.7

## [10.0.0-beta.6](https://github.com/videojs/v10/compare/@videojs/spf@10.0.0-beta.5...@videojs/spf@10.0.0-beta.6) (2026-03-15)


### Miscellaneous Chores

* **@videojs/spf:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.6

## [10.0.0-beta.5](https://github.com/videojs/v10/compare/@videojs/spf@10.0.0-beta.4...@videojs/spf@10.0.0-beta.5) (2026-03-12)


### Miscellaneous Chores

* **@videojs/spf:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.5

## [10.0.0-beta.4](https://github.com/videojs/v10/compare/@videojs/spf@10.0.0-beta.3...@videojs/spf@10.0.0-beta.4) (2026-03-12)


### Features

* **spf:** stream segment fetches via ReadableStream body ([#890](https://github.com/videojs/v10/issues/890)) ([6fcb8eb](https://github.com/videojs/v10/commit/6fcb8eb989efc049af8a7567fce8e35b10f24168))


### Bug Fixes

* **spf:** propagate byteRange when building segment load tasks ([#904](https://github.com/videojs/v10/issues/904)) ([801be29](https://github.com/videojs/v10/commit/801be291c33ce3e611c4bc8af6c64bf6f68bc6e9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.4

## [10.0.0-beta.3](https://github.com/videojs/v10/compare/@videojs/spf@10.0.0-beta.2...@videojs/spf@10.0.0-beta.3) (2026-03-11)


### Miscellaneous Chores

* **@videojs/spf:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.3

## [10.0.0-beta.2](https://github.com/videojs/v10/compare/@videojs/spf@10.0.0-beta.1...@videojs/spf@10.0.0-beta.2) (2026-03-10)


### Miscellaneous Chores

* **@videojs/spf:** Synchronize videojs versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.2

## [10.0.0-beta.1](https://github.com/videojs/v10/compare/@videojs/spf@10.0.0-beta.0...@videojs/spf@10.0.0-beta.1) (2026-03-10)


### Features

* **spf:** basic ManagedMediaSource support for Safari ([#843](https://github.com/videojs/v10/issues/843)) ([4bd2875](https://github.com/videojs/v10/commit/4bd287515fa118b6a337e9af9494596e2055decf))
* **spf:** initial push of SPF ([#784](https://github.com/videojs/v10/issues/784)) ([27a3993](https://github.com/videojs/v10/commit/27a3993fb20af0523e42b0d03c70a6f5a465d144))


### Bug Fixes

* **packages:** set release-please manifest and package versions to beta.0 ([#850](https://github.com/videojs/v10/issues/850)) ([e085a0d](https://github.com/videojs/v10/commit/e085a0d73af0c142e0c0a371337daae98fdbaac9))
* **spf:** add missing repository field ([#844](https://github.com/videojs/v10/issues/844)) ([32b1299](https://github.com/videojs/v10/commit/32b1299be1e794d9c9f34ede6af5016d7e349998))
* **spf:** fix async teardown leaks and recreate engine on src change ([#841](https://github.com/videojs/v10/issues/841)) ([f50d509](https://github.com/videojs/v10/commit/f50d509749522f48e66a8b5a5a98fa2255195ba8))
* **spf:** prefer MediaSource over ManagedMediaSource ([#838](https://github.com/videojs/v10/issues/838)) ([54f71d6](https://github.com/videojs/v10/commit/54f71d62aa925f8eb5a7f8399ae0374f313774ea))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.1

## [10.0.0-alpha.11](https://github.com/videojs/v10/compare/@videojs/spf@10.0.0-alpha.10...@videojs/spf@10.0.0-alpha.11) (2026-03-10)


### Features

* **spf:** basic ManagedMediaSource support for Safari ([#843](https://github.com/videojs/v10/issues/843)) ([4bd2875](https://github.com/videojs/v10/commit/4bd287515fa118b6a337e9af9494596e2055decf))


### Bug Fixes

* **spf:** add missing repository field ([#844](https://github.com/videojs/v10/issues/844)) ([32b1299](https://github.com/videojs/v10/commit/32b1299be1e794d9c9f34ede6af5016d7e349998))
* **spf:** fix async teardown leaks and recreate engine on src change ([#841](https://github.com/videojs/v10/issues/841)) ([f50d509](https://github.com/videojs/v10/commit/f50d509749522f48e66a8b5a5a98fa2255195ba8))
* **spf:** prefer MediaSource over ManagedMediaSource ([#838](https://github.com/videojs/v10/issues/838)) ([54f71d6](https://github.com/videojs/v10/commit/54f71d62aa925f8eb5a7f8399ae0374f313774ea))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-alpha.11

## 10.0.0-alpha.10 (2026-03-10)


### Features

* **spf:** initial push of SPF ([#784](https://github.com/videojs/v10/issues/784)) ([27a3993](https://github.com/videojs/v10/commit/27a3993fb20af0523e42b0d03c70a6f5a465d144))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-alpha.10
