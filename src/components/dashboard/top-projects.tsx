
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ProjectSummary } from './project-card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface TopProjectsProps {
  summaries: ProjectSummary[];
  currency: string;
}

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

export function TopProjects({ summaries, currency }: TopProjectsProps) {

  const topProjects = useMemo(() => {
    return [...summaries]
        .sort((a, b) => b.profitLoss - a.profitLoss)
        .slice(0, 5);
  }, [summaries]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Projects</CardTitle>
        <CardDescription>Your top 5 projects by profit/loss.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {topProjects.map(summary => (
            <Link href={`/dashboard/projects/${summary.project.id}`} key={summary.project.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="h-9 w-9 hidden sm:flex">
                    <AvatarFallback>{getInitials(summary.project.name)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1 flex-1">
                    <p className="text-sm font-medium leading-none truncate">{summary.project.name}</p>
                </div>
                <div className={cn("font-medium text-right", summary.profitLoss >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {formatCurrency(summary.profitLoss, currency)}
                </div>
          </Link>
        ))}
        {topProjects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No projects with financial data yet.</p>
        )}
      </CardContent>
    </Card>
  );
}


