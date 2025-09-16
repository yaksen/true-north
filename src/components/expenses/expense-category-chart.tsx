
'use client';

import { TrendingUp } from 'lucide-react';
import { Pie, PieChart, Cell, LabelList } from 'recharts';
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

const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => ({
    x: cx + radius * Math.cos((-angle * Math.PI) / 180),
    y: cy + radius * Math.sin((-angle * Math.PI) / 180),
});

const CustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, percent, name } = props;
    const { x: x1, y: y1 } = polarToCartesian(cx, cy, outerRadius, midAngle);
    const { x: x2, y: y2 } = polarToCartesian(cx, cy, outerRadius + 20, midAngle);
    const { x: x3, y: y3 } = polarToCartesian(cx, cy, outerRadius + 40, midAngle);

    const textAnchor = x3 > cx ? 'start' : 'end';

    return (
        <>
            <path
                d={`M${x1},${y1}L${x2},${y2}L${x3},${y3}`}
                stroke="hsl(var(--muted-foreground))"
                fill="none"
            />
            <text x={x3} y={y3} textAnchor={textAnchor} dominantBaseline="central" className="text-xs fill-muted-foreground">
                ({(percent * 100).toFixed(0)}%)
            </text>
        </>
    );
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
        <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">No expense data for this period.</p>
        </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-64">
      <PieChart margin={{ top: 30, right: 50, bottom: 30, left: 50 }}>
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
        <Pie 
            data={chartData} 
            dataKey="value" 
            nameKey="name" 
            innerRadius={60} 
            outerRadius={80} 
            strokeWidth={5}
            labelLine={false}
            label={<CustomizedLabel />}
        >
            {chartData.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
            ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
