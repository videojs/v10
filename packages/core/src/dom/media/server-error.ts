export function serverMethodError(className: string, method: string): never {
  throw new Error(
    `${className}.${method}() was called on the server. ` +
      `This is a server-only stub — media methods cannot run outside the browser.`
  );
}
