export function yieldConsoleBanner(version: string): void {
  // eslint-disable-next-line no-console
  console.info(
    `%c Video.js %c v${version}`,
    `border-radius: 9999px;
    background: #393836;
    font: bold 1.5em/1.5em monospace;
    color: #ebe4c1;
    text-shadow: 1px 1px 0 #fcb116, 
      2px 2px 0 #f26222, 
      3px 3px 0 #ea3837, 
      4px 4px 0 #a83b71`,
    `font: 1em monospace;`,
  );

  const prereleaseType = version.includes('preview') ? 'preview' : version.includes('alpha') ? 'alpha' : null;
  if (prereleaseType) {
    console.warn(
      `%c This is a ${prereleaseType} release. Please use with caution.`,
      `color: #f26222;`,
    );
  }

  // eslint-disable-next-line no-console
  console.info(
    '%cReport a Bug, Issue or Feature Request - https://github.com/videojs/v10/issues/new/choose',
    'color: #aaa; font-size: .9em;',
  );
  // eslint-disable-next-line no-console
  console.info(
    '%cReach out on Discord - https://discord.gg/JBqHh485uF',
    'color: #aaa; font-size: .9em;',
  );
}
