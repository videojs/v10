const getEnvPlayerVersion = () => {
  try {
    return /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ __PLAYER_VERSION__ as string;
  } catch {}
  return 'UNKNOWN';
};

const player_version: string = getEnvPlayerVersion();

export const getPlayerVersion = () => player_version;
