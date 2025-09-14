
'use client';

import { TrendingUp } from 'lucide-react';
import { Pie, PieChart, Cell } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';

interface ChartData {
  name: string;
  value: number;
  fill: string;
  color?: string;
}

interface ExpenseCategoryChartProps {
  data: Omit<ChartData, 'fill'>[];
  currency: string;
  total: number;
}

const generateColor = (index: number) => {
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--primary) / 0.8)',
    'hsl(var(--primary) / 0.6)',
    'hsl(var(--primary) / 0.4)',
    'hsl(var(--primary) / 0.2)',
  ];
  return colors[index % colors.length];
};

export function ExpenseCategoryChart({ data, currency, total }: ExpenseCategoryChartProps) {
    const chartData = useMemo(() => {
        return data.map((item, index) => ({
            ...item,
            fill: item.color || generateColor(index),
        }));
    }, [data]);
    
    const chartConfig = useMemo(() => {
        const config: ChartConfig = {};
        chartData.forEach(item => {
            config[item.name] = {
                label: item.name,
                color: item.fill,
            };
        });
        return config;
    }, [chartData]);


  if (data.length === 0) {
    return (
        <div className="flex items-center justify-center h-48">
            <p className="text-sm text-muted-foreground">No expense data for this period.</p>
        </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-48">
      <PieChart>
        <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent 
                hideLabel 
                formatter={(value, name) => {
                    const percentage = total > 0 ? (((value as number) / total) * 100).toFixed(1) : 0;
                    return (
                        <div className='flex flex-col gap-1'>
                            <span className='font-medium'>{name}</span>
                            <div className='flex justify-between items-center gap-4'>
                                <span className='text-muted-foreground'>{formatCurrency(value as number, currency)}</span>
                                <span className='font-bold text-primary'>{percentage}%</span>
                            </div>
                        </div>
                    )
                }}
            />}
        />
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
            {chartData.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
