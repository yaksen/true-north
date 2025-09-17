
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Task, Project, Lead, TaskTemplateSlot, ProjectMember } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { logActivity } from '@/lib/activity-log';

const slots: TaskTemplateSlot[] = ['morning', 'midday', 'night'];

const formSchema = z.object({
  projectId: z.string().nonempty({ message: 'Project is required.' }),
  parentTaskId: z.string().optional(),
  leadId: z.string().optional(),
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  description: z.string().optional(),
  slot: z.enum(slots),
  dueDate: z.date().optional(),
  assigneeUid: z.string().optional(),
});

type TaskFormValues = z.infer<typeof formSchema>;

interface TaskFormProps {
  task?: Task;
  projectId?: string;
  parentTaskId?: string;
  leadId?: string;
  projects?: Project[];
  leads?: Lead[];
  members?: ProjectMember[];
  closeForm: () => void;
}

export function TaskForm({ task, projectId, parentTaskId, leadId, projects, leads, members, closeForm }: TaskFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: task ? {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    } : {
      projectId: projectId || '',
      parentTaskId: parentTaskId || '',
      leadId: leadId || '',
      title: '',
      description: '',
      slot: 'morning',
      dueDate: new Date(),
      assigneeUid: user?.uid || '',
    },
  });

  async function onSubmit(values: TaskFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const finalProjectId = values.projectId;

      if (task) {
        const taskRef = doc(db, 'tasks', task.id);
        await updateDoc(taskRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(finalProjectId, 'task_updated', { title: values.title }, user.uid);
        toast({ title: 'Success', description: 'Task updated successfully.' });
      } else {
        const taskData: any = {
          ...values,
          completed: false, // New tasks are not completed by default
          assigneeUid: values.assigneeUid || user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'tasks'), taskData);
        await logActivity(finalProjectId, 'task_created', { title: values.title }, user.uid);
        toast({ title: 'Success', description: 'Task created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting task form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {projects && (
           <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a project..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
           />
        )}
         <div className='grid grid-cols-2 gap-4'>
            {leads && (
            <FormField
                control={form.control}
                name="leadId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Lead (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Assign to a lead..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {leads.map(l => (
                                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            )}
             <FormField
                control={form.control}
                name="assigneeUid"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an assignee..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {members?.map(m => (
                                    <SelectItem key={m.uid} value={m.uid}>{m.displayName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Design the new logo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="A brief description of the task..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="slot"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Slot</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            {slots.map(slot => (
                                <SelectItem key={slot} value={slot} className="capitalize">{slot}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Due Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(new Date(field.value), "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date("1900-01-01")}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {task ? 'Update' : 'Create'} Task
          </Button>
        </div>
      </form>
    </Form>
  );
}
