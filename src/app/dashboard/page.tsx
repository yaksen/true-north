
'use client';

import { useEffect, useState } from 'react';
import { SummaryCard } from "@/components/dashboard/summary-card";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Contact, ShoppingBag, Shapes, Box, Loader2, CheckSquare } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';

interface SummaryCounts {
    leadCount: number;
    serviceCount: number;
    categoryCount: number;
    packageCount: number;
    actionCount: number;
}

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [counts, setCounts] = useState<SummaryCounts | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            // This should be handled by the layout's auth guard, but as a fallback.
            setLoading(false);
            return;
        }

        async function fetchData() {
            setLoading(true);
            try {
                const leadsCol = collection(db, `users/${user.uid}/leads`);
                const servicesCol = collection(db, `users/${user.uid}/services`);
                const categoriesCol = collection(db, `users/${user.uid}/categories`);
                const packagesCol = collection(db, `users/${user.uid}/packages`);
                const actionsCol = collection(db, `users/${user.uid}/actions`);

                const [leadsSnapshot, servicesSnapshot, categoriesSnapshot, packagesSnapshot, actionsSnapshot] = await Promise.all([
                    getCountFromServer(leadsCol),
                    getCountFromServer(servicesCol),
                    getCountFromServer(categoriesCol),
                    getCountFromServer(packagesCol),
                    getCountFromServer(actionsCol),
                ]);

                const summaryCounts = {
                    leadCount: leadsSnapshot.data().count,
                    serviceCount: servicesSnapshot.data().count,
                    categoryCount: categoriesSnapshot.data().count,
                    packageCount: packagesSnapshot.data().count,
                    actionCount: actionsSnapshot.data().count,
                };
                
                setCounts(summaryCounts);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [user, authLoading]);

    if (loading || authLoading) {
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
            {counts && (
                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-5">
                    <SummaryCard title="Total Leads" value={counts.leadCount} icon={Contact} />
                    <SummaryCard title="Total Services" value={counts.serviceCount} icon={ShoppingBag} />
                    <SummaryCard title="Total Categories" value={counts.categoryCount} icon={Shapes} />
                    <SummaryCard title="Total Packages" value={counts.packageCount} icon={Box} />
                    <SummaryCard title="Total Actions" value={counts.actionCount} icon={CheckSquare} />
                </div>
            )}
        </>
    );
}
