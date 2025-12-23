import { actions } from 'astro:actions';

import { useState } from 'react';

/**
 * OAuth login button with popup-based authentication flow
 *
 * - Opens OAuth flow in a centered popup window
 * - Listens for success messages from the popup
 * - Automatically reloads page on successful authentication
 * - Falls back to full-page redirect if popup is blocked
 */
export default function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Initiates the OAuth login flow in a popup window
   */
  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Request authorization URL from server
      const result = await actions.auth.initiateLogin();

      if (result.error) {
        throw new Error(result.error.message);
      }

      const { authorizationUrl } = result.data;

      // Calculate centered popup position
      const width = 600;
      const height = 800;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;

      // Open authorization URL in a centered popup window
      const popup = window.open(
        authorizationUrl,
        'oauth-login',
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      if (popup) {
        // Track the popup check interval for cleanup
        let checkPopup: NodeJS.Timeout;

        /**
         * Listen for success messages from the popup window
         * Validates origin to prevent XSS attacks
         */
        const handleMessage = (event: MessageEvent) => {
          // Validate message origin to prevent XSS
          if (event.origin !== window.location.origin) return;

          if (event.data?.type === 'success') {
            // Clean up listeners and reload to reflect authenticated state
            window.removeEventListener('message', handleMessage);
            clearInterval(checkPopup);
            setLoading(false);
            window.location.reload();
          }
        };

        window.addEventListener('message', handleMessage);

        // Poll for popup closure as a fallback mechanism
        checkPopup = setInterval(() => {
          if (popup?.closed) {
            // Clean up and reload to fetch user session
            clearInterval(checkPopup);
            window.removeEventListener('message', handleMessage);
            setLoading(false);
            window.location.reload();
          }
        }, 500);
      } else {
        // Popup blocked - fall back to full-page redirect
        window.location.href = authorizationUrl;
      }
    } catch (err) {
      // Display user-friendly error message
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  /**
   * Test handler for authenticated Mux API requests
   */
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

      {error && <p>{error}</p>}
    </div>
  );
}
