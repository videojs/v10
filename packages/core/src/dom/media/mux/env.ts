const getEnvPlayerVersion = () => {
  try {
    // @ts-expect-error
    return __PLAYER_VERSION__ as string;
  } catch {}
  return 'UNKNOWN';
};

const player_version: string = getEnvPlayerVersion();

/** Read the player version baked in at build time, or `'UNKNOWN'` when unavailable. */
export const getPlayerVersion = () => player_version;
