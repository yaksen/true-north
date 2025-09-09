
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
import type { Action } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  rawTasks: z.string().min(10, { message: 'Please enter a few tasks to get started.' }),
});

type AiPlannerFormValues = z.infer<typeof formSchema>;

interface AiPlannerProps {
  onSaveActions: (actions: Omit<Action, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
}

export function AiPlanner({ onSaveActions: onSaveActions }: AiPlannerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [plannedActions, setPlannedActions] = useState<z.infer<typeof DailyPlanOutputSchema>['plannedTasks']>([]);
  const { toast } = useToast();

  const form = useForm<AiPlannerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rawTasks: '',
    },
  });

  async function onSubmit(values: AiPlannerFormValues) {
    setIsGenerating(true);
    setPlannedActions([]);
    try {
      const result = await planDailyTasks({ rawTasks: values.rawTasks });
      if (result && result.plannedTasks) {
        // Assign UUIDs to subtasks here
        const actionsWithSubtaskIds = result.plannedTasks.map(task => ({
            ...task,
            subtasks: task.subtasks?.map(st => ({ ...st, id: uuidv4() }))
        }));
        setPlannedActions(actionsWithSubtaskIds);
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
    const actionsToSave = plannedActions.map(pa => {
        const dueDate = pa.dueDate && !isNaN(new Date(pa.dueDate).getTime()) ? new Date(pa.dueDate) : undefined;
        return {
            ...pa,
            dueDate,
            type: 'other' as const, // Default type for AI generated tasks
        };
    });
    onSaveActions(actionsToSave);
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

      {plannedActions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">AI-Generated Plan</h3>
          <ScrollArea className="h-72 rounded-md border p-4">
            <div className="space-y-4">
                {plannedActions.map((action, index) => (
                    <div key={index}>
                        <div className="font-bold">{action.title}</div>
                        <div className="text-sm text-muted-foreground">{action.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="capitalize">{action.priority}</Badge>
                            {action.dueDate && <Badge variant="secondary">{action.dueDate}</Badge>}
                        </div>
                         {action.subtasks && action.subtasks.length > 0 && (
                            <div className="mt-2 pl-4">
                                {action.subtasks.map(st => <div key={st.id} className="text-sm text-muted-foreground"> - {st.title}</div>)}
                            </div>
                         )}
                         {action.obstacles && action.obstacles.length > 0 && (
                            <div className="mt-1 text-xs italic text-amber-400">Obstacles: {action.obstacles.join(', ')}</div>
                         )}
                         {action.tips && action.tips.length > 0 && (
                            <div className="mt-1 text-xs text-sky-400">Tips: {action.tips.join(', ')}</div>
                         )}
                         {index < plannedActions.length - 1 && <Separator className="my-4" />}
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
