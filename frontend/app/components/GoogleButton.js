'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function GoogleButton({ label = 'Continue with Google' }) {
  const { loginWithGoogle } = useAuth();
  const router = useRouter();
  const divRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-google-oauth-client-id')) return;

    function init() {
      if (!window.google || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            await loginWithGoogle(response.credential);
            router.push('/');
          } catch (err) {
            setError(err.message || 'Google sign-in failed');
          }
        },
      });

      window.google.accounts.id.renderButton(divRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        // FIX: Lowered from 320 to 260 to fit perfectly within compact mobile frames
        width: 260,
        text: label === 'Continue with Google' ? 'continue_with' : 'signup_with',
      });
      setReady(true);
    }

    if (window.google) {
      init();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = init;
      document.body.appendChild(script);
    }
  }, [loginWithGoogle, router, label]);

  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('your-google-oauth-client-id')) {
    return (
      <div className="text-xs text-white/30 border border-white/10 rounded-xl py-3 text-center w-full">
        Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="relative w-full min-h-[44px] flex items-center justify-center overflow-hidden">
        <div ref={divRef} className={!ready ? 'opacity-0 absolute' : 'flex justify-center w-full'} />
        {!ready && <div className="w-[260px] h-11 rounded-full border border-white/10 animate-pulse bg-white/5" />}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}