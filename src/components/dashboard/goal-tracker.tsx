
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import { ChartConfig, ChartContainer } from '../ui/chart';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import type { CurrencyCode } from '@/context/CurrencyContext';
import { CurrencyInput } from '../ui/currency-input';
import { Input } from '../ui/input';

interface GoalTrackerProps {
  currentRevenue: number;
  goal?: number;
  goalCurrency?: CurrencyCode;
  goalReward?: string;
  goalRewardEmoji?: string;
  currency: string;
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;


const formSchema = z.object({
  revenueGoal: z.coerce.number().min(1, 'Goal must be a positive number.'),
  goalCurrency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  goalReward: z.string().optional(),
  goalRewardEmoji: z.string().optional(),
});
type GoalFormValues = z.infer<typeof formSchema>;

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};


export function GoalTracker({ currentRevenue, goal = 10000, goalCurrency = 'LKR', goalReward, goalRewardEmoji, currency }: GoalTrackerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const convertedGoal = useMemo(() => {
    return convert(goal, goalCurrency, currency);
  }, [goal, goalCurrency, currency]);
  
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
        revenueGoal: goal,
        goalCurrency: goalCurrency as 'LKR' | 'USD' | 'EUR' | 'GBP',
        goalReward: goalReward || '',
        goalRewardEmoji: goalRewardEmoji || '',
    },
  });

  useEffect(() => {
    form.reset({
        revenueGoal: goal,
        goalCurrency: goalCurrency as 'LKR' | 'USD' | 'EUR' | 'GBP',
        goalReward: goalReward || '',
        goalRewardEmoji: goalRewardEmoji || '',
    });
  }, [goal, goalCurrency, goalReward, goalRewardEmoji, form]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact' }).format(amount);
  };

  const progress = convertedGoal > 0 ? Math.min((currentRevenue / convertedGoal) * 100, 100) : 0;
  const isGoalReached = progress >= 100;
  const chartData = [{ name: 'revenue', value: progress, fill: 'hsl(var(--primary))' }];

  async function onSubmit(values: GoalFormValues) {
    setIsSubmitting(true);
    try {
        await setDoc(doc(db, 'settings', 'crm'), { 
            revenueGoal: values.revenueGoal,
            goalCurrency: values.goalCurrency,
            goalReward: values.goalReward,
            goalRewardEmoji: values.goalRewardEmoji,
        }, { merge: true });
        toast({ title: 'Success', description: 'Revenue goal updated!' });
        setIsDialogOpen(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update revenue goal.'});
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Revenue Goal</CardTitle>
        <CardDescription>This month&apos;s target</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-full w-full"
        >
          <RadialBarChart
            data={chartData}
            startAngle={-90}
            endAngle={isGoalReached ? 270 : -90 + (progress / 100) * 360}
            innerRadius="70%"
            outerRadius="100%"
            barSize={20}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              dataKey="value"
              tick={false}
            />
            <RadialBar
              dataKey="value"
              background={{ fill: 'hsl(var(--muted))' }}
              cornerRadius={10}
              
            />
             {isGoalReached ? (
                <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground text-4xl"
                >
                    {goalRewardEmoji || '🎉'}
                </text>
             ) : (
                <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground text-2xl font-bold"
                >
                    {`${Math.round(progress)}%`}
                </text>
             )}
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <div className="flex flex-col gap-2 p-6 pt-0">
        <div className='text-center text-sm text-muted-foreground'>
            {isGoalReached ? (
                <p className='font-semibold text-primary'>{goalReward || 'Goal Reached!'}</p>
            ) : (
                <p>{formatCurrency(currentRevenue)} / {formatCurrency(convertedGoal)}</p>
            )}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">Set New Goal</Button>
            </DialogTrigger>
            <DialogContent className='max-w-md'>
                <DialogHeader>
                    <DialogTitle>Set Monthly Revenue Goal</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="revenueGoal"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Revenue Goal</FormLabel>
                                <FormControl>
                                    <CurrencyInput
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        currency={form.watch('goalCurrency')}
                                        onCurrencyChange={(value) => form.setValue('goalCurrency', value)}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="goalReward"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Goal Reward (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Team Pizza Party!" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="goalRewardEmoji"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Reward Emoji (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="🍕" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Set Goal
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
