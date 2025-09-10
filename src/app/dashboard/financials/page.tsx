
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Invoice, Action } from '@/lib/types';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { DollarSign, FileWarning, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

// Basic column definition for placeholder
const transactionColumns: ColumnDef<any>[] = [
    { accessorKey: 'date', header: 'Date' },
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'amount', header: 'Amount (LKR)' },
];

export default function FinancialsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalRevenue: 0, outstandingAmount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchFinancialData() {
      setLoading(true);
      try {
        // Fetch paid invoices for total revenue
        const invoicesQuery = query(
          collection(db, `users/${user.uid}/invoices`),
          where('status', '==', 'paid')
        );
        const invoicesSnapshot = await getDocs(invoicesQuery);
        const totalRevenue = invoicesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalLKR || 0), 0);
        
        // Fetch sent/overdue invoices for outstanding amount
        const outstandingQuery = query(
            collection(db, `users/${user.uid}/invoices`),
            where('status', 'in', ['sent', 'overdue'])
        );
        const outstandingSnapshot = await getDocs(outstandingQuery);
        const outstandingAmount = outstandingSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalLKR || 0), 0);

        setStats({ totalRevenue, outstandingAmount });

      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFinancialData();
  }, [user]);

  if (loading) {
    return (
        <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Financial Overview</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Revenue" value={stats.totalRevenue} icon={DollarSign} prefix="LKR" />
        <SummaryCard title="Outstanding Invoices" value={stats.outstandingAmount} icon={FileWarning} prefix="LKR" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Profit & Loss</CardTitle>
                <CardDescription>A summary of revenue and expenses over time.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-60 bg-muted/50 rounded-md">
                    <TrendingUp className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">P&L chart coming soon!</p>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>A log of recent financial activities.</CardDescription>
            </CardHeader>
            <CardContent>
                 <DataTable columns={transactionColumns} data={[]} />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
