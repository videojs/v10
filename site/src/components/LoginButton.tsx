import { actions } from 'astro:actions';

import { useState } from 'react';

export default function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await actions.auth.initiateLogin();

      if (result.error) {
        throw new Error(result.error.message);
      }

      const { authorizationUrl } = result.data;

      // Open the authorization URL in a centered popup
      const width = 600;
      const height = 800;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      const popup = window.open(
        authorizationUrl,
        'oauth-login',
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      if (popup) {
        // Track the popup check interval
        let checkPopup: NodeJS.Timeout;

        // Listen for messages from the popup (success notification)
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data?.type === 'success') {
            window.removeEventListener('message', handleMessage);
            clearInterval(checkPopup);
            setLoading(false);
            // Reload the page to reflect the authenticated state
            window.location.reload();
          }
        };

        window.addEventListener('message', handleMessage);

        // Also listen for the popup to close as a fallback
        checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            window.removeEventListener('message', handleMessage);
            setLoading(false);
            // Reload the page to fetch user data
            window.location.reload();
          }
        }, 500);
      } else {
        // Sorry, have to redirect you manually
        window.location.href = authorizationUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleMuxRequest = async () => {
    const result = await actions.mux.listAssets({ limit: 10, page: 1 });

    if (result.error) {
      console.error('Error fetching assets:', result.error);
    }
  };

  return (
    <div>
      <button type="button" onClick={handleLogin} disabled={loading}>
        {loading ? 'Authenticating...' : 'Login'}
      </button>
      <br />

      <button type="button" onClick={handleMuxRequest}>
        Request Mux Assets
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
