
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ProjectSummary } from './project-card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface TopProjectsProps {
  summaries: ProjectSummary[];
}

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

export function TopProjects({ summaries }: TopProjectsProps) {

  const topProjects = useMemo(() => {
    return [...summaries]
        .sort((a, b) => b.totalIncome - a.totalIncome)
        .slice(0, 5);
  }, [summaries]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Projects</CardTitle>
        <CardDescription>Your top 5 projects by total revenue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {topProjects.map(summary => (
            <Link href={`/dashboard/projects/${summary.project.id}`} key={summary.project.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="h-9 w-9 hidden sm:flex">
                    <AvatarFallback>{getInitials(summary.project.name)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1 flex-1">
                    <p className="text-sm font-medium leading-none truncate">{summary.project.name}</p>
                    <p className={cn("text-xs", summary.profitLoss >= 0 ? "text-green-400" : "text-red-400")}>
                        P/L: {formatCurrency(summary.profitLoss, summary.project.currency)}
                    </p>
                </div>
                <div className="font-medium text-right">{formatCurrency(summary.totalIncome, summary.project.currency)}</div>
          </Link>
        ))}
        {topProjects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No projects with revenue yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
