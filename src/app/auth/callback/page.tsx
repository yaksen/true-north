
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTokensAndStore } from '@/app/actions/google-auth';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuthCallbackPage() {
    const searchParams = useSearchParams();
    const { toast } = useToast();

    useEffect(() => {
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (code && state) {
            getTokensAndStore(code, state)
                .then(({ projectId }) => {
                    // Inform the opener window to redirect and then close the popup.
                    if (window.opener) {
                        window.opener.postMessage({ type: 'auth-success', projectId: projectId }, window.location.origin);
                    }
                    window.close();
                })
                .catch(error => {
                    toast({
                        variant: 'destructive',
                        title: 'Authentication Failed',
                        description: error.message || 'An unknown error occurred during authentication.'
                    });
                    if (window.opener) {
                         window.opener.postMessage({ type: 'auth-error', error: error.message }, window.location.origin);
                    }
                    window.close();
                });
        } else {
             toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: 'Could not find authorization code. Please try again.'
            });
            window.close();
        }
    }, [searchParams, toast]);

    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Authenticating, please wait...</p>
                <p className="text-sm text-muted-foreground">This window will close automatically.</p>
            </div>
        </div>
    );
}
