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

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for the popup to close (authentication complete)
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          setLoading(false);
          // Optionally reload the page or fetch user data
          window.location.reload();
        }
      }, 500);
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
