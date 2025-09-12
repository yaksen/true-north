
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
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
