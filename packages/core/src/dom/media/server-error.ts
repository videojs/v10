export function throwServerError(label: string): never {
  throw new Error(
    `${label} was called on the server. ` + `This is a server-only stub — media methods cannot run outside the browser.`
  );
}
