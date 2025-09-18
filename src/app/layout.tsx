import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { CurrencyProvider } from '@/context/CurrencyContext';


export const metadata: Metadata = {
  title: 'TrueNorth',
  description: 'A modern CRM for your business needs.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("font-sans antialiased dark")}>
        <AuthProvider>
          <CurrencyProvider>
            {children}
            <Toaster />
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
