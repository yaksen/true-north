
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ProjectSummary } from './project-card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useMemo } from 'react';

interface TopProjectsProps {
  summaries: ProjectSummary[];
}

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
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
      <CardContent className="space-y-4">
        {topProjects.map(summary => (
            <div key={summary.project.id} className="flex items-center gap-4">
                <Avatar className="h-9 w-9">
                    <AvatarFallback>{getInitials(summary.project.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow space-y-1">
                    <p className="text-sm font-medium leading-none truncate">{summary.project.name}</p>
                    <p className="text-sm text-muted-foreground">
                        Profit/Loss: {formatCurrency(summary.profitLoss, summary.project.currency)}
                    </p>
                </div>
                <div className="font-medium text-right">{formatCurrency(summary.totalIncome, summary.project.currency)}</div>
          </div>
        ))}
        {topProjects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">No projects with revenue yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
