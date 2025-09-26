
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getGoogleTokens } from '@/app/actions/google-auth';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState('Processing authentication...');
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      getGoogleTokens(code, state)
        .then(result => {
          if (result.success) {
            setMessage(result.message);
            const { projectId } = JSON.parse(state);
            // Redirect back to project settings after a delay
            setTimeout(() => {
                router.push(`/dashboard/projects/${projectId}/settings`);
            }, 3000);
          } else {
            setError(result.message);
          }
        })
        .catch(err => {
          setError(err.message || 'An unexpected error occurred during token exchange.');
        });
    } else {
      setError('Missing authorization code or state from Google. Please try again.');
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <div className="text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-destructive mb-4">Authentication Failed</h1>
            <p className="text-destructive-foreground">{error}</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-6">
              Return to Dashboard
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h1 className="text-2xl font-bold mb-2">Almost there!</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}

// Minimal button component for this page to avoid circular dependencies
const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      {...props}
    />
);
