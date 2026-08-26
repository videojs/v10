# Changelog

## [10.0.0-beta.32](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.31...@videojs/skins@10.0.0-beta.32) (2026-08-26)


### ⚠ BREAKING CHANGES

* **packages:** separate controls content and backdrop surfaces ([#2436](https://github.com/videojs/v10/issues/2436))
* **packages:** separate dialog popup and backdrop surfaces ([#2435](https://github.com/videojs/v10/issues/2435))
* **html:** replace ContainerMixin with ContainerElement ([#2280](https://github.com/videojs/v10/issues/2280))

### Features

* **packages:** add dialog component ([#2379](https://github.com/videojs/v10/issues/2379)) ([108b8fd](https://github.com/videojs/v10/commit/108b8fda826a870bf29453289a0081ebd7df890c))
* **packages:** add vjsc style diagnostics ([#2345](https://github.com/videojs/v10/issues/2345)) ([fa515b6](https://github.com/videojs/v10/commit/fa515b633909e6e242fef92661634b5b75943cf0))
* **packages:** add volume popover compound ([#2378](https://github.com/videojs/v10/issues/2378)) ([a23fdd9](https://github.com/videojs/v10/commit/a23fdd93e56c07aab53cad0e66672926b1582411))
* **packages:** expose container controls state ([#2376](https://github.com/videojs/v10/issues/2376)) ([30065dd](https://github.com/videojs/v10/commit/30065dd1980c35484b41b3a4925a6ef049aae6a0))
* **packages:** separate controls content and backdrop surfaces ([#2436](https://github.com/videojs/v10/issues/2436)) ([7a6ccb0](https://github.com/videojs/v10/commit/7a6ccb0058c0a15fa30fd07cef3f662ac121d90c))
* **packages:** separate dialog popup and backdrop surfaces ([#2435](https://github.com/videojs/v10/issues/2435)) ([0065e9f](https://github.com/videojs/v10/commit/0065e9f77ced3a5f9878e135c5a1bcd1825f229d))


### Bug Fixes

* **packages:** harden vjsc vite workflow ([#2355](https://github.com/videojs/v10/issues/2355)) ([8da1f84](https://github.com/videojs/v10/commit/8da1f84e22db027e447535c9f61004c7159fd142))
* **packages:** improve menu behavior and sizing ([#2440](https://github.com/videojs/v10/issues/2440)) ([0d90572](https://github.com/videojs/v10/commit/0d9057268c59d17a4c91f1f84a60333cf082fd38))
* **packages:** restore minimal volume controls ([#2386](https://github.com/videojs/v10/issues/2386)) ([2e9c1e2](https://github.com/videojs/v10/commit/2e9c1e221e4eca5dbc76e01718fabf82c433a483))
* **packages:** restore vjsc skin visual parity ([#2344](https://github.com/videojs/v10/issues/2344)) ([d157a63](https://github.com/videojs/v10/commit/d157a63f0b725239752746b87bb7c41dd3af8e53))
* **sandbox:** use fixed ports for sandbox and skins dev ([#2353](https://github.com/videojs/v10/issues/2353)) ([5664043](https://github.com/videojs/v10/commit/56640436ccaf7e754e87736ba6b828b5dc956a0a))


### Performance Improvements

* **packages:** enable native MagicString ([#2311](https://github.com/videojs/v10/issues/2311)) ([599007f](https://github.com/videojs/v10/commit/599007f72461b51eb4a4ad28049bb7bbc3e207d7))


### Code Refactoring

* **html:** replace ContainerMixin with ContainerElement ([#2280](https://github.com/videojs/v10/issues/2280)) ([76fa285](https://github.com/videojs/v10/commit/76fa285c3e91143d6776dfce4562147116036751))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.32
  * devDependencies
    * @videojs/core bumped to 10.0.0-beta.32
    * @videojs/icons bumped to 10.0.0-beta.32

## [10.0.0-beta.31](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.30...@videojs/skins@10.0.0-beta.31) (2026-08-21)


### Features

* **packages:** add right-to-left player support ([#2281](https://github.com/videojs/v10/issues/2281)) ([caf179b](https://github.com/videojs/v10/commit/caf179b83260a242a7ff284d1d474f97a91988a9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.31
  * devDependencies
    * @videojs/core bumped to 10.0.0-beta.31
    * @videojs/icons bumped to 10.0.0-beta.31

## [10.0.0-beta.30](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.29...@videojs/skins@10.0.0-beta.30) (2026-08-20)


### ⚠ BREAKING CHANGES

* **packages:** remove built-in poster placeholders ([#2063](https://github.com/videojs/v10/issues/2063))

### Bug Fixes

* **skin:** stabilize menu sizing and motion ([#2283](https://github.com/videojs/v10/issues/2283)) ([191538e](https://github.com/videojs/v10/commit/191538e99935ffdced88e77fef55405410558562))


### Code Refactoring

* **packages:** remove built-in poster placeholders ([#2063](https://github.com/videojs/v10/issues/2063)) ([e7de7a7](https://github.com/videojs/v10/commit/e7de7a78c4806403a2416926bdbeddb171de1fed))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.30
  * devDependencies
    * @videojs/core bumped to 10.0.0-beta.30
    * @videojs/icons bumped to 10.0.0-beta.30

## [10.0.0-beta.29](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.28...@videojs/skins@10.0.0-beta.29) (2026-08-19)


### ⚠ BREAKING CHANGES

* **packages:** resolve the poster in the store, and set src on img from it ([#2039](https://github.com/videojs/v10/issues/2039))

### Features

* **packages:** resolve the poster in the store, and set src on img from it ([#2039](https://github.com/videojs/v10/issues/2039)) ([7a902db](https://github.com/videojs/v10/commit/7a902db20e9ec335eb27a6cee6aaa6a7c0d0e29d))
* **skin:** add canonical buffering indicator ([#2189](https://github.com/videojs/v10/issues/2189)) ([4055cd5](https://github.com/videojs/v10/commit/4055cd5cd93fbeb902159701c74d8839d05737fc))
* **skin:** add canonical captions button ([#2191](https://github.com/videojs/v10/issues/2191)) ([6a6d8a6](https://github.com/videojs/v10/commit/6a6d8a669afb24299ffd745fe60b937e0c1a2b1f))
* **skin:** add canonical error dialog ([#2190](https://github.com/videojs/v10/issues/2190)) ([fdfa869](https://github.com/videojs/v10/commit/fdfa869edaf42989194f18c33c8e438257220518))
* **skin:** add canonical input indicators ([#2193](https://github.com/videojs/v10/issues/2193)) ([549f65c](https://github.com/videojs/v10/commit/549f65c88411279fd1e3153efbe6c3d541648bb6))
* **skin:** add canonical minimal video skin ([#2199](https://github.com/videojs/v10/issues/2199)) ([87b2eb3](https://github.com/videojs/v10/commit/87b2eb3c949235e3612a0a00e6bb23c8f721f98f))
* **skin:** add canonical remote playback controls ([#2192](https://github.com/videojs/v10/issues/2192)) ([ec0572d](https://github.com/videojs/v10/commit/ec0572d9af57752e28befbc07ba57440aa209a15))
* **skin:** add canonical styling and registry output ([#2202](https://github.com/videojs/v10/issues/2202)) ([8982d8d](https://github.com/videojs/v10/commit/8982d8d88e09827ad14ed406864c1db14d66c9c8))
* **skin:** add canonical time slider chapters ([#2195](https://github.com/videojs/v10/issues/2195)) ([44ba4e9](https://github.com/videojs/v10/commit/44ba4e97be5e792680bb8f53edd44492a043459b))
* **skin:** add canonical video input bindings ([#2197](https://github.com/videojs/v10/issues/2197)) ([885eb82](https://github.com/videojs/v10/commit/885eb824c0a5b38443a8a750c8d9f8b4a6ba23ee))
* **skin:** add canonical video settings menu ([#2196](https://github.com/videojs/v10/issues/2196)) ([db7e1c3](https://github.com/videojs/v10/commit/db7e1c31c44385119aa6a9d119d422ea982c1a7f))
* **skin:** complete canonical default video skin ([#2198](https://github.com/videojs/v10/issues/2198)) ([941a6bf](https://github.com/videojs/v10/commit/941a6bfa485bb717522233fb6065ad4d811fb81f))
* **skin:** complete canonical volume popover ([#2194](https://github.com/videojs/v10/issues/2194)) ([6fd0684](https://github.com/videojs/v10/commit/6fd068423062b42a2ea6c4cd93ffadafe58dfb96))
* **skin:** share settings menu composition ([#2203](https://github.com/videojs/v10/issues/2203)) ([9b109ba](https://github.com/videojs/v10/commit/9b109ba01230ff166dbd02ba1bbb7e652f94402f))


### Bug Fixes

* **skin:** align canonical poster and default controls ([#2181](https://github.com/videojs/v10/issues/2181)) ([58db042](https://github.com/videojs/v10/commit/58db04269f0683055e557d2df5b9ab5f6508088b))
* **skin:** preserve slider preview behavior ([#2259](https://github.com/videojs/v10/issues/2259)) ([e20e542](https://github.com/videojs/v10/commit/e20e54255a2536f651a1bf46e2f1c75262483349))
* **skin:** style fixes ([#2257](https://github.com/videojs/v10/issues/2257)) ([ae1ca50](https://github.com/videojs/v10/commit/ae1ca50920e6a7db143c524b4808998e32ed83c5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.29
  * devDependencies
    * @videojs/core bumped to 10.0.0-beta.29
    * @videojs/icons bumped to 10.0.0-beta.29

## [10.0.0-beta.28](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.27...@videojs/skins@10.0.0-beta.28) (2026-08-19)


### Bug Fixes

* **skin:** misc style fixes ([#2232](https://github.com/videojs/v10/issues/2232)) ([1e8cc17](https://github.com/videojs/v10/commit/1e8cc17912e6a31427eb607e07ac56db921e908e))
* **skin:** use finite radius value ([#2253](https://github.com/videojs/v10/issues/2253)) ([2cc8249](https://github.com/videojs/v10/commit/2cc8249907d44b94319f4578ecb5463981a2e237))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.28
  * devDependencies
    * @videojs/core bumped to 10.0.0-beta.28
    * @videojs/icons bumped to 10.0.0-beta.28

## [10.0.0-beta.27](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.26...@videojs/skins@10.0.0-beta.27) (2026-08-17)


### ⚠ BREAKING CHANGES

* **skin:** css clean up and API stabilization ([#2094](https://github.com/videojs/v10/issues/2094))
* **packages:** separate input indicator components ([#2046](https://github.com/videojs/v10/issues/2046))

### Features

* **compiler:** add artifact dependency graph ([#1990](https://github.com/videojs/v10/issues/1990)) ([91394ca](https://github.com/videojs/v10/commit/91394cad83f3cb24fa190a1cafe241ca0f52edf6))
* **packages:** add canonical skin source boundary ([#1989](https://github.com/videojs/v10/issues/1989)) ([12c5a90](https://github.com/videojs/v10/commit/12c5a90e83cfcfe69ed9d18b4fb49307e682d407))
* **packages:** add chaptered time sliders ([#2043](https://github.com/videojs/v10/issues/2043)) ([6490051](https://github.com/videojs/v10/commit/6490051ac8b991f8c9c47e2cb424b9ffb676230c))
* **packages:** normalize volume slider availability ([#2072](https://github.com/videojs/v10/issues/2072)) ([5704678](https://github.com/videojs/v10/commit/5704678b1daadcf73636047b2f3772d8c4780996))
* **skin:** add canonical container, poster, and overlay ([#2179](https://github.com/videojs/v10/issues/2179)) ([4f72ee7](https://github.com/videojs/v10/commit/4f72ee7092f7b909c8c892af1f94a10297c97338))
* **skin:** add canonical default video controls ([#1992](https://github.com/videojs/v10/issues/1992)) ([feb86c8](https://github.com/videojs/v10/commit/feb86c8d0facf48051585c9bddcf335695477bc2))
* **skin:** add canonical PlayButton source ([#1991](https://github.com/videojs/v10/issues/1991)) ([de5f2bb](https://github.com/videojs/v10/commit/de5f2bbcc153ac0da0b9969f693ee732a8e6f196))
* **skin:** add canonical volume controls ([#1993](https://github.com/videojs/v10/issues/1993)) ([2aff94c](https://github.com/videojs/v10/commit/2aff94c7a073cebb2b3c4e06131e3b4cf8963051))
* **skin:** add registry catalog adapter ([#2008](https://github.com/videojs/v10/issues/2008)) ([650d4c2](https://github.com/videojs/v10/commit/650d4c23021ea1b92277d853e3ab8d1d329c8d53))
* **skin:** build pipeline ([#2021](https://github.com/videojs/v10/issues/2021)) ([9381a34](https://github.com/videojs/v10/commit/9381a34025848812325f47634c4e745ba9103f11))
* **skin:** setup basic tailwind styles for new skin system ([#2005](https://github.com/videojs/v10/issues/2005)) ([48c8dff](https://github.com/videojs/v10/commit/48c8dff3b9a7f93c725ad16cfd7c5e7f38579125))


### Bug Fixes

* **packages:** improve ui motion ([#2208](https://github.com/videojs/v10/issues/2208)) ([42f934e](https://github.com/videojs/v10/commit/42f934e9bea4e4961d63d6de1e2eebcc520f8237))
* **packages:** keep live edge indicator colored ([#1921](https://github.com/videojs/v10/issues/1921)) ([0e04454](https://github.com/videojs/v10/commit/0e04454518067ac54912602c862652e627184c8e))
* **skin:** increase time hidden threshold in default skin ([#2030](https://github.com/videojs/v10/issues/2030)) ([79edd1f](https://github.com/videojs/v10/commit/79edd1f5d0a8eb1ec570791b1728ff2a6739ddbd))
* **skin:** keep menu scroll position while hovering ([#2100](https://github.com/videojs/v10/issues/2100)) ([3fc0bcb](https://github.com/videojs/v10/commit/3fc0bcb4a08a8c20823d8e867cce4e61271730ec))
* **skins:** update submenu transitions ([#2130](https://github.com/videojs/v10/issues/2130)) ([c3de3d4](https://github.com/videojs/v10/commit/c3de3d4ff368c2ea1626151a25ff143f3ddc528a))
* **skin:** use pixels for default scale unit ([#2054](https://github.com/videojs/v10/issues/2054)) ([7657d3c](https://github.com/videojs/v10/commit/7657d3cd2e14f0d42055d0e482e20e781e239beb))
* **test:** repair e2e regressions ([#2055](https://github.com/videojs/v10/issues/2055)) ([65c882b](https://github.com/videojs/v10/commit/65c882bf39c6cb70b2a46a7873d9057b42bffb3d))


### Code Refactoring

* **packages:** separate input indicator components ([#2046](https://github.com/videojs/v10/issues/2046)) ([5bdb870](https://github.com/videojs/v10/commit/5bdb87088e6c60b1a4e6838ea38944a7cf125d12))
* **skin:** css clean up and API stabilization ([#2094](https://github.com/videojs/v10/issues/2094)) ([39a0291](https://github.com/videojs/v10/commit/39a0291be7cad177e09bf7b4c8e74592a17b3744))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.27
  * devDependencies
    * @videojs/core bumped to 10.0.0-beta.27
    * @videojs/icons bumped to 10.0.0-beta.27

## [10.0.0-beta.26](https://github.com/videojs/v10/compare/@videojs/skins@10.0.0-beta.25...@videojs/skins@10.0.0-beta.26) (2026-08-02)


### ⚠ BREAKING CHANGES

* **packages:** replace button availability with disabled and hidden state ([#1474](https://github.com/videojs/v10/issues/1474))

### Features

* **skin:** improved responsive design ([#1832](https://github.com/videojs/v10/issues/1832)) ([c8a9eec](https://github.com/videojs/v10/commit/c8a9eecaf89139bd80965f39052c1483b910d6bc))


### Bug Fixes

* **sandbox:** prevent css causing full app refresh ([#1869](https://github.com/videojs/v10/issues/1869)) ([5cb93c1](https://github.com/videojs/v10/commit/5cb93c17010dbb5eabb3fff71250bea13b211043))
* **test:** remove seek tests, add missing tests ([#1892](https://github.com/videojs/v10/issues/1892)) ([115229b](https://github.com/videojs/v10/commit/115229b3bca742834dbd412af1e9722e2ed3dd5f))


### Code Refactoring

* **packages:** replace button availability with disabled and hidden state ([#1474](https://github.com/videojs/v10/issues/1474)) ([066227d](https://github.com/videojs/v10/commit/066227de5819570a339fd0e291fc236c51632017))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @videojs/utils bumped to 10.0.0-beta.26

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
