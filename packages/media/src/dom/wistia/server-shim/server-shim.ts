/**
 * `@wistia/wistia-player` is the element, not a library that happens to register one: it reads `location`,
 * measures the `screen`, binds to the `document` and calls `customElements.define` while it evaluates. There
 * is no server build and no entry that stops short of that, so importing the package on a server throws
 * before any of it can be feature-detected away — and importing it lazily instead is what this project moved
 * off, since an element defined a tick late reaches React and the store as a bare `HTMLElement`.
 *
 * So the import stays static, and this lends that evaluation the globals it reaches for. Import this module
 * above `@wistia/wistia-player` and call what it hands back below: a module is evaluated before the one
 * importing it, so the stubs are in place by the time Wistia runs and gone again before anything else looks.
 * Leaving them would be worse than the crash they prevent — every framework decides it is in a browser by
 * asking whether `window` exists.
 *
 * In a browser nothing is installed and nothing is taken away.
 */
export const restoreWistiaGlobals: () => void = shimWistiaGlobals();

function shimWistiaGlobals(): () => void {
  /**
   * What Wistia's evaluation reads, and no more: every member here was arrived at by importing the package
   * on a server and answering what it asked for. Guessing past that would be guessing about a bundle Wistia
   * rebuilds on its own schedule, and a stub nothing reads is a stub nothing keeps honest. They are inert —
   * getting through evaluation is the whole job, and the code that would call any of this needs a browser.
   */
  const shims: Record<string, () => unknown> = {
    window: () => globalThis,
    location: () => new URL('http://localhost/'),
    // 24 is the color depth of a screen that is not HDR, which is the answer for having no screen at all.
    screen: () => ({ colorDepth: 24 }),
    document: () => ({
      createElement: () => ({ style: {} }),
      getElementsByTagName: () => [],
      addEventListener: noop,
    }),
    HTMLElement: () => class {},
    customElements: () => ({
      define: noop,
      get: () => undefined,
      upgrade: noop,
      whenDefined: () => Promise.resolve(undefined),
    }),
  };

  const globals = globalThis as Record<string, unknown>;
  const installed: string[] = [];

  for (const [name, create] of Object.entries(shims)) {
    if (name in globals) continue;
    globals[name] = create();
    installed.push(name);
  }

  return () => {
    // Emptied as it goes: both platform packages import this one, and the second is owed no second cleanup.
    for (const name of installed.splice(0)) Reflect.deleteProperty(globals, name);
  };
}

function noop(): void {}
