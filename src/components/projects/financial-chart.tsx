
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/utils';

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

interface FinancialChartProps {
  data: MonthlyData[];
  currency: string;
}

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--primary))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;


export function FinancialChart({ data, currency }: FinancialChartProps) {
  if (data.length === 0) {
    return (
        <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">No financial data available for this period.</p>
        </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
        <ResponsiveContainer>
            <BarChart data={data}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                />
                <Tooltip
                    cursor={{ fill: 'hsl(var(--accent))' }}
                    content={<ChartTooltipContent
                        formatter={(value, name) => formatCurrency(value as number, currency)}
                        indicator="dot"
                    />}
                />
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={4} />
                <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={4} />
            </BarChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
