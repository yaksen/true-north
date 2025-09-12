
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import { ChartConfig, ChartContainer } from '../ui/chart';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

interface GoalTrackerProps {
  currentRevenue: number;
  goal?: number;
}

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formSchema = z.object({
  revenueGoal: z.coerce.number().min(1, 'Goal must be a positive number.'),
});
type GoalFormValues = z.infer<typeof formSchema>;

export function GoalTracker({ currentRevenue, goal = 10000 }: GoalTrackerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { revenueGoal: goal },
  });

  const progress = Math.min((currentRevenue / goal) * 100, 100);
  const chartData = [{ name: 'revenue', value: progress, fill: 'hsl(var(--primary))' }];

  async function onSubmit(values: GoalFormValues) {
    setIsSubmitting(true);
    try {
        await setDoc(doc(db, 'settings', 'crm'), { revenueGoal: values.revenueGoal }, { merge: true });
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
            endAngle={270}
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
             <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-4xl font-bold"
            >
                {`${Math.round(progress)}%`}
            </text>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <div className="flex flex-col gap-2 p-6 pt-0">
        <div className='text-center text-sm text-muted-foreground'>
            <p>{formatCurrency(currentRevenue)} / {formatCurrency(goal)}</p>
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
                            <FormLabel>Revenue Goal (USD)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g. 10000" {...field} />
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
