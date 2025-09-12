
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user) {
        return <div className="p-4">Please sign in to view the dashboard.</div>
    }

    return (
        <>
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Welcome to TrueNorth</CardTitle>
                    <CardDescription>This is your main dashboard. High-level stats and recent activity will show up here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className='text-muted-foreground'>Content is being built. Check out the Projects section!</p>
                </CardContent>
            </Card>
        </>
    );
}
