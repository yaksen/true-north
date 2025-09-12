
'use client';

import { useEffect, useState } from 'react';
import { SummaryCard } from "@/components/dashboard/summary-card";
import { collection, getCountFromServer, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Contact, ShoppingBag, Shapes, Box, Loader2, CheckSquare, TrendingUp, Users } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import type { Action, Invoice, Lead } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartStyle } from '@/components/ui/chart';

interface DashboardStats {
    leadCount: number;
    serviceCount: number;
    categoryCount: number;
    packageCount: number;
    actionCount: number;
    projectCount: number;
    userCount: number;
    totalRevenue: number;
    activeLeads: number;
}

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading) setLoading(false);
            return;
        }

        async function fetchData() {
            setLoading(true);
            try {
                const userPath = `users/${user.uid}`;
                const leadsCol = collection(db, `${userPath}/leads`);
                const servicesCol = collection(db, `${userPath}/services`);
                const categoriesCol = collection(db, `${userPath}/categories`);
                const packagesCol = collection(db, `${userPath}/packages`);
                const actionsCol = collection(db, `${userPath}/actions`);
                const projectsCol = collection(db, `${userPath}/projects`);
                const usersCol = collection(db, 'users'); // Global collection
                const invoicesCol = collection(db, `${userPath}/invoices`);

                const activeLeadsQuery = query(leadsCol, where('state', 'in', ['new', 'contacted', 'interested']));
                const paidInvoicesQuery = query(invoicesCol, where('status', '==', 'paid'));

                const [
                    leadsSnapshot, servicesSnapshot, categoriesSnapshot, packagesSnapshot, 
                    actionsSnapshot, projectsSnapshot, usersSnapshot, paidInvoicesSnapshot,
                    activeLeadsSnapshot
                ] = await Promise.all([
                    getCountFromServer(leadsCol),
                    getCountFromServer(servicesCol),
                    getCountFromServer(categoriesCol),
                    getCountFromServer(packagesCol),
                    getCountFromServer(actionsCol),
                    getCountFromServer(projectsCol),
                    getCountFromServer(usersCol),
                    getDocs(paidInvoicesQuery),
                    getCountFromServer(activeLeadsQuery)
                ]);

                const totalRevenue = paidInvoicesSnapshot.docs.reduce((sum, doc) => {
                    const invoice = doc.data() as Invoice;
                    return sum + invoice.totalLKR;
                }, 0);

                setStats({
                    leadCount: leadsSnapshot.data().count,
                    serviceCount: servicesSnapshot.data().count,
                    categoryCount: categoriesSnapshot.data().count,
                    packageCount: packagesSnapshot.data().count,
                    actionCount: actionsSnapshot.data().count,
                    projectCount: projectsSnapshot.data().count,
                    userCount: usersSnapshot.data().count,
                    totalRevenue,
                    activeLeads: activeLeadsSnapshot.data().count,
                });

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [user, authLoading]);
    
    const chartData = [
        { metric: "Leads", value: stats?.leadCount || 0, fill: "var(--color-Leads)"},
        { metric: "Services", value: stats?.serviceCount || 0, fill: "var(--color-Services)" },
        { metric: "Packages", value: stats?.packageCount || 0, fill: "var(--color-Packages)" },
        { metric: "Projects", value: stats?.projectCount || 0, fill: "var(--color-Projects)" },
        { metric: "Tasks", value: stats?.actionCount || 0, fill: "var(--color-Tasks)" },
    ]

    const chartConfig = {
      value: {
        label: "Total",
      },
      Leads: {
        label: "Leads",
        color: "hsl(var(--chart-1))",
      },
      Services: {
        label: "Services",
        color: "hsl(var(--chart-2))",
      },
      Packages: {
        label: "Packages",
        color: "hsl(var(--chart-3))",
      },
      Projects: {
        label: "Projects",
        color: "hsl(var(--chart-4))",
      },
      Tasks: {
        label: "Tasks",
        color: "hsl(var(--chart-5))",
      },
    } satisfies import("@/components/ui/chart").ChartConfig


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
            {stats && (
                <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                    <SummaryCard title="Total Revenue" value={stats.totalRevenue} icon={TrendingUp} prefix="LKR" />
                    <SummaryCard title="Active Leads" value={stats.activeLeads} icon={Contact} />
                    <SummaryCard title="Projects" value={stats.projectCount} icon={Shapes} />
                    <SummaryCard title="Team Size" value={stats.userCount} icon={Users} />
                </div>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle>Business Overview</CardTitle>
                    <CardDescription>A summary of your core business entities.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartStyle />
                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                        <BarChart accessibilityLayer data={chartData}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                            dataKey="metric"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            />
                            <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Bar dataKey="value" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

        </>
    );
}
