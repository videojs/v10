/**
 * `@wistia/wistia-player` is the element, not a library that registers one: it reads `location`, measures the
 * `screen`, binds to the `document` and calls `customElements.define` while it evaluates, and ships no server
 * build that stops short of that. Importing it lazily instead is what this project moved off, since an
 * element defined a tick late reaches React and the store as a bare `HTMLElement`.
 *
 * So `media.ts` imports it statically, above everything, and this lends that evaluation what it reaches for.
 * A module is evaluated before the one importing it, so the stubs are in place by the time Wistia runs — and
 * `media.ts` takes them back the moment Wistia is through, because a `window` left behind is every framework
 * downstream deciding it is in a browser. In a browser nothing is installed and nothing is taken away.
 */
export const restoreWistiaGlobals: () => void = shimWistiaGlobals();

function shimWistiaGlobals(): () => void {
  // What Wistia's evaluation reads and no more, each one arrived at by importing the package on a server and
  // answering what it asked for. Inert: getting through evaluation is the whole job.
  const shims: Record<string, unknown> = {
    window: globalThis,
    location: new URL('http://localhost/'),
    // The color depth of a screen that is not HDR, which is the answer for having no screen at all.
    screen: { colorDepth: 24 },
    document: { createElement: () => ({ style: {} }), getElementsByTagName: () => [], addEventListener: noop },
    HTMLElement: class {},
    customElements: { define: noop, get: () => undefined },
  };

  const globals = globalThis as Record<string, unknown>;
  const installed: string[] = [];

  for (const [name, stub] of Object.entries(shims)) {
    if (name in globals) continue;
    globals[name] = stub;
    installed.push(name);
  }

  // Emptied as it goes, so a second call cannot take away a global this one did not install.
  return () => {
    for (const name of installed.splice(0)) Reflect.deleteProperty(globals, name);
  };
}

function noop(): void {}
