
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTokensAndStore } from '@/app/actions/google-auth';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (code && state) {
            getTokensAndStore(code, state)
                .then(({ projectId }) => {
                    // Send a success message to the main window
                    if (window.opener) {
                        window.opener.postMessage({ type: 'auth-success', projectId }, window.location.origin);
                    }
                })
                .catch(error => {
                     // Send an error message to the main window
                    if (window.opener) {
                        window.opener.postMessage({ type: 'auth-error', error: error.message || 'An unknown error occurred.' }, window.location.origin);
                    }
                })
                .finally(() => {
                    // Close the popup window regardless of success or failure
                    window.close();
                });
        } else {
             if (window.opener) {
                window.opener.postMessage({ type: 'auth-error', error: 'Authorization code or state was missing.' }, window.location.origin);
            }
            window.close();
        }
    }, [searchParams]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Authenticating, please wait...</p>
                <p className="text-sm text-muted-foreground">This window will close automatically.</p>
            </div>
        </div>
    );
}
