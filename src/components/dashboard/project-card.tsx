
'use client';

import type { Project } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import Link from 'next/link';
import { ChartConfig, ChartContainer } from '../ui/chart';

export interface ProjectSummary {
  project: Project;
  totalIncome: number;
  profitLoss: number;
  taskCompletionRate: number;
  monthlyPL: { name: string; pl: number }[];
}

interface ProjectCardProps {
  summary: ProjectSummary;
  currency: string;
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, signDisplay: 'never' }).format(amount);
};

const chartConfig = {
    pl: {
      label: "P/L",
      color: "hsl(var(--primary))",
    },
} satisfies ChartConfig;

export function ProjectCard({ summary, currency }: ProjectCardProps) {
  const { project, profitLoss, taskCompletionRate, monthlyPL } = summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate">{project.name}</CardTitle>
        <CardDescription>Profit / Loss</CardDescription>
        <p className={`text-2xl font-bold ${profitLoss >= 0 ? 'text-foreground' : 'text-red-500'}`}>
          {formatCurrency(profitLoss, currency)}
        </p>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyPL} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`colorPL-${project.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <Tooltip
                        cursor={false}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                                        P/L
                                        </span>
                                        <span className="font-bold text-muted-foreground">
                                        {formatCurrency(payload[0].value as number, currency)}
                                        </span>
                                    </div>
                                    </div>
                                </div>
                                )
                            }
                            return null
                        }}
                    />
                     <XAxis dataKey="name" hide />
                    <Area type="monotone" dataKey="pl" stroke="hsl(var(--primary))" fillOpacity={1} fill={`url(#colorPL-${project.id})`} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
        <div className="mt-4">
            <p className='text-xs text-muted-foreground mb-1'>Task Completion</p>
            <Progress value={taskCompletionRate} />
            <p className='text-xs text-muted-foreground text-right mt-1'>{taskCompletionRate.toFixed(0)}%</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" variant="outline">
          <Link href={`/dashboard/projects/${project.id}`}>Open Project</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
