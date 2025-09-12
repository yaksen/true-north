
'use client';

import type { Transaction, Project } from '@/lib/types';
import { useMemo } from 'react';
import { SummaryCard } from '../dashboard/summary-card';
import { MinusCircle, PlusCircle, DollarSign } from 'lucide-react';
import { DataTable } from '../ui/data-table';
import { getColumns } from '../financials/columns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';


interface ProjectFinanceProps {
  transactions: Transaction[];
  project: Project;
}

export function ProjectFinance({ transactions }: ProjectFinanceProps) {

  const financeSummary = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, netProfit };
  }, [transactions]);
  
  const chartData = [
    { name: "Income", value: financeSummary.totalIncome, fill: "hsl(var(--chart-1))" },
    { name: "Expenses", value: financeSummary.totalExpenses, fill: "hsl(var(--chart-2))" },
    { name: "Profit", value: financeSummary.netProfit, fill: "hsl(var(--chart-3))" },
  ]

  const chartConfig = {
      value: { label: "LKR" },
      income: { label: "Income", color: "hsl(var(--chart-1))" },
      expenses: { label: "Expenses", color: "hsl(var(--chart-2))" },
      profit: { label: "Profit", color: "hsl(var(--chart-3))" },
  } satisfies import("@/components/ui/chart").ChartConfig

  const columns = getColumns();

  return (
    <div className="space-y-6 mt-4">
        <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard title="Total Income" value={financeSummary.totalIncome} icon={PlusCircle} prefix="LKR" />
            <SummaryCard title="Total Expenses" value={financeSummary.totalExpenses} icon={MinusCircle} prefix="LKR" />
            <SummaryCard title="Net Profit" value={financeSummary.netProfit} icon={DollarSign} prefix="LKR" />
        </div>
        
         <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Profit & Loss Summary</CardTitle>
                    <CardDescription>A high-level overview of income vs. expenses for this project.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                        <BarChart accessibilityLayer data={chartData} layout="vertical">
                            <XAxis type="number" dataKey="value" hide />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={-4} width={80} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                            <Bar dataKey="value" layout="vertical" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                    <CardDescription>A log of all income and expense activities for this project.</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable columns={columns} data={transactions} />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
