
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Invoice, Transaction } from '@/lib/types';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { DollarSign, FileWarning, TrendingUp, Loader2, MinusCircle, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/financials/columns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

export default function FinancialsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalRevenue: 0, totalExpenses: 0, outstandingAmount: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const transactionsQuery = query(collection(db, `users/${user.uid}/transactions`));
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ 
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
        } as Transaction));
        setTransactions(data);

        const totalExpenses = data
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        setStats(prev => ({ ...prev, totalExpenses }));
    });

    const invoicesQuery = query(collection(db, `users/${user.uid}/invoices`));
    const unsubscribeInvoices = onSnapshot(invoicesQuery, (snapshot) => {
      let totalRevenue = 0;
      let outstandingAmount = 0;
      snapshot.forEach(doc => {
        const invoice = doc.data() as Invoice;
        if (invoice.status === 'paid') {
          totalRevenue += invoice.totalLKR;
        } else if (invoice.status === 'sent' || invoice.status === 'overdue') {
          outstandingAmount += invoice.totalLKR;
        }
      });
      setStats(prev => ({ ...prev, totalRevenue, outstandingAmount }));
      setLoading(false);
    });

    return () => {
        unsubscribeTransactions();
        unsubscribeInvoices();
    };
  }, [user]);

  const chartData = [
    { name: "Revenue", value: stats.totalRevenue, fill: "var(--color-revenue)" },
    { name: "Expenses", value: stats.totalExpenses, fill: "var(--color-expenses)" },
    { name: "Profit", value: stats.totalRevenue - stats.totalExpenses, fill: "var(--color-profit)" },
  ]


  if (loading) {
    return (
        <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  const columns = getColumns();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Financial Overview</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Revenue" value={stats.totalRevenue} icon={PlusCircle} prefix="LKR" />
        <SummaryCard title="Total Expenses" value={stats.totalExpenses} icon={MinusCircle} prefix="LKR" />
        <SummaryCard title="Net Profit" value={stats.totalRevenue - stats.totalExpenses} icon={DollarSign} prefix="LKR" />
        <SummaryCard title="Outstanding Invoices" value={stats.outstandingAmount} icon={FileWarning} prefix="LKR" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Profit & Loss Summary</CardTitle>
                <CardDescription>A high-level overview of revenue vs. expenses.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={80} />
                        <Bar dataKey="value" radius={[4, 4, 4, 4]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>A log of all income and expense activities.</CardDescription>
            </CardHeader>
            <CardContent>
                 <DataTable columns={columns} data={transactions} />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
