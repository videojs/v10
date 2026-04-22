const getEnvPlayerVersion = () => {
  try {
    // @ts-expect-error
    return __PLAYER_VERSION__ as string;
  } catch {}
  return 'UNKNOWN';
};

const player_version: string = getEnvPlayerVersion();

export const getPlayerVersion = () => player_version;
