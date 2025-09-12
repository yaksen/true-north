
'use client';

import { DollarSign, ListChecks, Briefcase, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

export interface GlobalSummary {
    totalPL: number;
    totalRevenue: number;
    avgTaskCompletion: number;
    activeProjects: number;
    currency: string;
}

interface SummaryCardsProps {
    summary: GlobalSummary;
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact' }).format(amount);
};

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue, summary.currency)}</div>
          <p className="text-xs text-muted-foreground">Aggregated across all projects</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Global Profit/Loss</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${summary.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(summary.totalPL, summary.currency)}</div>
          <p className="text-xs text-muted-foreground">Aggregated across all projects</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.activeProjects}</div>
          <p className="text-xs text-muted-foreground">Projects you are a member of</p>
        </CardContent>
      </Card>
    </>
  );
}
