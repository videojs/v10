# BrowserStack compatibility checks

Run the packaged HTML and React video, minimal video, and audio pages on Chrome 111, Edge 111, Firefox 121, and WebKit 16.4. The checks cover CSS fallbacks, closed popovers, playback, seeking, and opening menus. Playback failure is a test failure, including missing H.264 support.

The existing floor job stays enabled. BrowserStack's desktop WebKit is still an engine approximation, not actual Safari. The optional iOS project runs Safari on a real device. Neither suite currently verifies captions or fullscreen.

## Enable CI

1. Add repository secrets `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY` for an Automate account.
2. Confirm the pinned combinations are available to that account using [BrowserStack's supported browser matrix](https://www.browserstack.com/docs/automate/playwright/browsers-and-os).
3. To include real iOS Safari, set repository variables `BROWSERSTACK_IOS_DEVICE` and `BROWSERSTACK_IOS_VERSION` to an available device and exact OS version. The intended floor is iOS 16.4. Availability must be confirmed in the account before enabling it; a newer device does not replace floor coverage.
4. Set repository variable `BROWSERSTACK_ENABLED` to `true` and dispatch the BrowserStack workflow.

The workflow runs nightly at 16:00 UTC and can be dispatched against a branch. It does not run on pull requests or have access to fork PR code. It starts and stops a BrowserStack Local tunnel for the generated app. One worker limits remote concurrency. Reports and screenshots are uploaded to Actions; session recordings are available in BrowserStack.

The suite asserts browser versions from their user agents so an unexpected upgrade fails. It requests a Playwright server release for the bundled Firefox/WebKit versions; branded Chrome/Edge use BrowserStack's version selection. These combinations require a first cloud run with credentials before they can be considered verified.

## Run locally

Prepare the packaged pages:

```sh
pnpm exec vp run '@videojs/e2e#prepare:player'
```

To verify the assertions on local Chromium without credentials or a tunnel:

```sh
BROWSERSTACK_LOCAL_TEST=1 pnpm -F @videojs/e2e test:browserstack
```

For a cloud run, export the two credentials, start [BrowserStack Local](https://www.browserstack.com/docs/local-testing/binary-params) with identifier `videojs`, and run:

```sh
pnpm -F @videojs/e2e test:browserstack
```

Use `BROWSERSTACK_LOCAL_IDENTIFIER` if the tunnel has another identifier. Set `BROWSERSTACK_IOS_DEVICE` and `BROWSERSTACK_IOS_VERSION` to add the real iOS project locally.
