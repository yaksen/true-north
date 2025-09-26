'use client';

import { AuthProvider } from '@/hooks/use-auth';
import { CurrencyProvider } from '@/context/CurrencyContext';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <CurrencyProvider>
                {children}
            </CurrencyProvider>
        </AuthProvider>
    );
}
