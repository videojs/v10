import { useState } from 'react';

export default function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch the authorization URL
      const response = await fetch('/api/auth/login', {
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const { authorizationUrl } = await response.json();

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
      setError(err.message);
      setLoading(false);
    }
  };

  const handleStatus = async () => {
    // try {
    // Fetch the authorization URL
    const response = await fetch('/api/auth/status', {
      credentials: 'same-origin',
    });

    console.log(response);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    //   const { authorizationUrl } = await response.json();

    //   // Open the authorization URL in a centered popup
    //   const width = 600;
    //   const height = 800;
    //   const left = (window.screen.width - width) / 2;
    //   const top = (window.screen.height - height) / 2;

    //   const popup = window.open(
    //     authorizationUrl,
    //     'oauth-login',
    //     `width=${width},height=${height},left=${left},top=${top}`,
    //   );

    //   if (!popup) {
    //     throw new Error('Popup blocked. Please allow popups for this site.');
    //   }

    //   // Listen for the popup to close (authentication complete)
    //   const checkPopup = setInterval(() => {
    //     if (popup.closed) {
    //       clearInterval(checkPopup);
    //       setLoading(false);
    //       // Optionally reload the page or fetch user data
    //       window.location.reload();
    //     }
    //   }, 500);
    // } catch (err) {
    //   setError(err.message);
    //   setLoading(false);
    // }
  };

  return (
    <div>
      <button type="button" onClick={handleLogin} disabled={loading}>
        {loading ? 'Authenticating...' : 'Login'}
      </button>

      <button type="button" onClick={handleStatus} disabled={loading}>
        Status
      </button>

      {/* https://api.mux.com/video/v1/assets */}

      <button
        type="button"
        onClick={(async () => {
          const response = await fetch('/api/mux/video/v1/assets', {
            credentials: 'same-origin',
          });

          console.log(response);
        })}
      >
        Request
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
