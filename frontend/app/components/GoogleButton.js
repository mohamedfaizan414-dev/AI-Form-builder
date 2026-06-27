'use client';

import { useEffect, useState } from 'react';

export default function GoogleButton({ label = 'Continue with Google' }) {
  const [client, setClient] = useState(null);

  useEffect(() => {
    // Load the Google Script dynamically if it isn't loaded yet
    const scriptId = 'google-gsi-client-script';
    let script = document.getElementById(scriptId);

    const initializeClient = () => {
      if (window.google?.accounts?.oauth2) {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          scope: 'openid profile email',
          callback: (response) => {
            if (response.access_token) {
              // Pass the access token or handle custom context authentication here
              console.log('Google Auth Access Token:', response.access_token);
            }
          },
        });
        setClient(tokenClient);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeClient;
      document.body.appendChild(script);
    } else if (window.google) {
      initializeClient();
    }
  }, []);

  const handleGoogleLogin = () => {
    if (client) {
      client.requestAccessToken();
    } else {
      console.error('Google Auth SDK not initialized yet.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      className="w-full flex items-center justify-center gap-3 bg-surface2 hover:bg-white/5 border border-border text-white rounded-xl py-3 px-4 text-sm font-medium transition-all active:scale-[0.98] select-none"
    >
      <svg className="w-5 h-5 min-w-[20px]" viewBox="0 0 24 24">
        <path
          fill="#EA4335"
          d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.091 14.973 0 12 0 7.354 0 3.307 2.664 1.291 6.56l3.975 3.205z"
        />
        <path
          fill="#4285F4"
          d="M16.04 15.345c-1.054.71-2.4 1.164-4.04 1.164a7.076 7.076 0 0 1-6.716-4.855L1.31 14.86c2.018 3.91 6.065 6.58 10.69 6.58 3.136 0 5.954-1.045 8.045-2.882l-3.995-3.213z"
        />
        <path
          fill="#FBBC05"
          d="M5.284 11.654a7.03 7.03 0 0 1 0-2.308L1.31 6.14a11.93 11.93 0 0 0 0 8.72l3.973-3.206z"
        />
        <path
          fill="#34A853"
          d="M23.49 12.275c0-.627-.064-1.345-.191-1.964H12v4.11h6.473a5.555 5.555 0 0 1-2.427 3.636l3.996 3.213c2.336-2.155 3.445-5.328 3.445-8.995z"
        />
      </svg>
      <span className="truncate">{label}</span>
    </button>
  );
}