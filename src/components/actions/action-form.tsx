
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Action, ActionStatus, ActionPriority, ActionType, Lead } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CalendarIcon, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const actionStatuses: ActionStatus[] = ['pending', 'in-progress', 'completed'];
const actionPriorities: ActionPriority[] = ['low', 'medium', 'high'];
const actionTypes: ActionType[] = ['call', 'visit', 'sale', 'follow-up', 'other'];

const subtaskSchema = z.object({
    id: z.string(),
    title: z.string().min(1, 'Subtask title cannot be empty.'),
    completed: z.boolean(),
});

const formSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  description: z.string().optional(),
  status: z.enum(actionStatuses),
  priority: z.enum(actionPriorities),
  type: z.enum(actionTypes),
  leadId: z.string().optional(),
  dueDate: z.date().optional(),
  subtasks: z.array(subtaskSchema).optional(),
});

type ActionFormValues = z.infer<typeof formSchema>;

interface ActionFormProps {
  action?: Action;
  closeForm: () => void;
}

export function ActionForm({ action, closeForm }: ActionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: action?.title ?? '',
      description: action?.description ?? '',
      status: action?.status ?? 'pending',
      priority: action?.priority ?? 'medium',
      type: action?.type ?? 'other',
      leadId: action?.leadId ?? '',
      dueDate: action?.dueDate,
      subtasks: action?.subtasks ?? [],
    },
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/leads`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
        setLeads(leadsData);
    });
    return () => unsubscribe();
  }, [user]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subtasks",
  });

  async function onSubmit(values: ActionFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    const actionData: any = {
        ...values,
        leadId: values.leadId === 'none' ? '' : values.leadId,
        userId: user.uid,
        assignedTo: user.uid, // Default assignment to self for now
    };

    try {
        if (action) {
            const actionRef = doc(db, `users/${user.uid}/actions`, action.id);
            await updateDoc(actionRef, { ...actionData, updatedAt: serverTimestamp() });
            toast({ title: 'Success', description: 'Action updated successfully.' });
        } else {
            await addDoc(collection(db, `users/${user.uid}/actions`), {
                ...actionData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Action created successfully.' });
        }
        closeForm();
    } catch (error) {
        console.error("Error submitting action form: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Follow up with client" {...field} />
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
                <Textarea placeholder="Add a description..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {actionStatuses.map(status => (
                            <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {actionPriorities.map(priority => (
                            <SelectItem key={priority} value={priority} className="capitalize">{priority}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Action Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {actionTypes.map(type => (
                            <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="leadId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Related Lead</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a lead" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {leads.map(lead => (
                                <SelectItem key={lead.id} value={lead.id}>{lead.name}</SelectItem>
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
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
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
        
        <div>
          <FormLabel>Subtasks</FormLabel>
          <div className="space-y-2 mt-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name={`subtasks.${index}.title`}
                  render={({ field }) => (
                    <Input {...field} placeholder="Subtask title" className="flex-grow" />
                  )}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ id: uuidv4(), title: '', completed: false })}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Subtask
          </Button>
        </div>

        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {action ? 'Update' : 'Create'} Action
            </Button>
        </div>
      </form>
    </Form>
  );
}
