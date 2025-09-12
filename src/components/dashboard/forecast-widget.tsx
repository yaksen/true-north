
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ProjectSummary } from './project-card';
import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ForecastWidgetProps {
  summaries: ProjectSummary[];
  currency: string;
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, signDisplay: 'auto' }).format(amount);
};

export function ForecastWidget({ summaries, currency }: ForecastWidgetProps) {
  const forecast = useMemo(() => {
    if (summaries.length === 0) return { monthly: 0, quarterly: 0 };
    
    // Simple forecast: average P/L of last 3 months, assuming same currency for now.
    const totalLast3MonthsPL = summaries.reduce((projectTotal, summary) => {
        const projectPL = summary.monthlyPL.slice(-3).reduce((sum, month) => sum + month.pl, 0);
        return projectTotal + projectPL;
    }, 0);

    const averageMonthlyPL = totalLast3MonthsPL / 3;
    const nextMonthForecast = averageMonthlyPL;
    const nextQuarterForecast = averageMonthlyPL * 3;

    return {
        monthly: nextMonthForecast,
        quarterly: nextQuarterForecast,
    }

  }, [summaries]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <span>P/L Forecast</span>
        </CardTitle>
        <CardDescription>Simple projection based on last 3 months average.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <p className="text-sm text-muted-foreground">Next Month</p>
            <p className={cn("text-xl font-bold", forecast.monthly >= 0 ? 'text-green-400' : 'text-red-400')}>{formatCurrency(forecast.monthly, currency)}</p>
        </div>
        <div>
            <p className="text-sm text-muted-foreground">Next Quarter</p>
            <p className={cn("text-xl font-bold", forecast.quarterly >= 0 ? 'text-green-400' : 'text-red-400')}>{formatCurrency(forecast.quarterly, currency)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
