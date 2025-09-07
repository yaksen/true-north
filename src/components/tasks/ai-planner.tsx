
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Sparkles } from 'lucide-react';
import { planDailyTasks, DailyPlanOutputSchema } from '@/ai/flows/plan-daily-tasks';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

const formSchema = z.object({
  rawTasks: z.string().min(10, { message: 'Please enter a few tasks to get started.' }),
});

type AiPlannerFormValues = z.infer<typeof formSchema>;

interface AiPlannerProps {
  onSaveTasks: (tasks: Omit<Task, 'id' | 'userId' | 'createdAt'>[]) => Promise<void>;
}

export function AiPlanner({ onSaveTasks }: AiPlannerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [plannedTasks, setPlannedTasks] = useState<z.infer<typeof DailyPlanOutputSchema>['plannedTasks']>([]);
  const { toast } = useToast();

  const form = useForm<AiPlannerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rawTasks: '',
    },
  });

  async function onSubmit(values: AiPlannerFormValues) {
    setIsGenerating(true);
    setPlannedTasks([]);
    try {
      const result = await planDailyTasks({ rawTasks: values.rawTasks });
      if (result && result.plannedTasks) {
        setPlannedTasks(result.plannedTasks);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'AI could not generate a plan.' });
      }
    } catch (error) {
      console.error("Error generating daily plan: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setIsGenerating(false);
    }
  }

  const handleSave = () => {
    const tasksToSave = plannedTasks.map(pt => ({
        ...pt,
        dueDate: pt.dueDate ? new Date(pt.dueDate) : undefined,
    }));
    onSaveTasks(tasksToSave);
  };

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="rawTasks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Raw Task Dump</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., call the marketing agency, finish the report for tomorrow, buy milk, meeting with John at 2pm about the new design"
                    rows={6}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Plan
            </Button>
          </div>
        </form>
      </Form>

      {plannedTasks.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">AI-Generated Plan</h3>
          <ScrollArea className="h-72 rounded-md border p-4">
            <div className="space-y-4">
                {plannedTasks.map((task, index) => (
                    <div key={index}>
                        <div className="font-bold">{task.title}</div>
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="capitalize">{task.priority}</Badge>
                            {task.dueDate && <Badge variant="secondary">{task.dueDate}</Badge>}
                        </div>
                         {task.subtasks && task.subtasks.length > 0 && (
                            <div className="mt-2 pl-4">
                                {task.subtasks.map(st => <div key={st.id} className="text-sm text-muted-foreground"> - {st.title}</div>)}
                            </div>
                         )}
                         {task.obstacles && task.obstacles.length > 0 && (
                            <div className="mt-1 text-xs italic text-amber-400">Obstacles: {task.obstacles.join(', ')}</div>
                         )}
                         {task.tips && task.tips.length > 0 && (
                            <div className="mt-1 text-xs text-sky-400">Tips: {task.tips.join(', ')}</div>
                         )}
                         {index < plannedTasks.length - 1 && <Separator className="my-4" />}
                    </div>
                ))}
            </div>
          </ScrollArea>
           <div className="flex justify-end mt-4">
            <Button onClick={handleSave}>
                Save Plan
            </Button>
           </div>
        </div>
      )}
    </div>
  );
}
