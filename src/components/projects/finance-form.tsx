
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Finance, FinanceType, Project } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { logActivity } from '@/lib/activity-log';

const financeTypes: FinanceType[] = ['income', 'expense'];

const formSchema = z.object({
  projectId: z.string().nonempty({ message: 'Project is required.' }),
  type: z.enum(financeTypes, { required_error: 'Type is required.' }),
  amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
  description: z.string().min(2, { message: 'Description must be at least 2 characters.' }),
  date: z.date({ required_error: 'A date is required.' }),
  category: z.string().optional(),
  currency: z.string(),
});

type FinanceFormValues = z.infer<typeof formSchema>;

interface FinanceFormProps {
  finance?: Finance;
  project?: { id: string, currency: string };
  projects?: Project[];
  leadId?: string;
  closeForm: () => void;
}

export function FinanceForm({ finance, project, projects, leadId, closeForm }: FinanceFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FinanceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: finance ? {
        ...finance,
        projectId: finance.projectId,
        date: finance.date ? new Date(finance.date) : new Date(),
    } : {
      projectId: project?.id || '',
      type: 'income',
      amount: 0,
      description: '',
      date: new Date(),
      category: '',
      currency: project?.currency || '',
    },
  });
  
  const selectedProjectId = form.watch('projectId');
  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  useEffect(() => {
    if (selectedProject) {
        form.setValue('currency', selectedProject.currency);
    }
  }, [selectedProject, form]);


  async function onSubmit(values: FinanceFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
      if (finance) {
        const financeRef = doc(db, 'finances', finance.id);
        await updateDoc(financeRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(values.projectId, 'finance_updated', { description: values.description }, user.uid);
        toast({ title: 'Success', description: 'Record updated successfully.' });
      } else {
        const financeData: any = {
          ...values,
          recordedByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (leadId) {
            financeData.leadId = leadId;
        }
        await addDoc(collection(db, 'finances'), financeData);
        await logActivity(values.projectId, 'finance_created', { description: values.description }, user.uid);
        toast({ title: 'Success', description: 'Record created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting finance form: ", error);
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
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Initial client payment" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            {financeTypes.map(type => (
                                <SelectItem key={type} value={type} className='capitalize'>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount ({form.getValues('currency') || project?.currency})</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
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
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category (Optional)</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Software" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {finance ? 'Update' : 'Create'} Record
          </Button>
        </div>
      </form>
    </Form>
  );
}
