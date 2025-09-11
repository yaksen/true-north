
'use client';

import { useForm } from 'react-hook-form';
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
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { Action, ExpenseDetails, Transaction } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const expenseSchema = z.object({
  expenseType: z.enum(['Marketing', 'Operations', 'HR', 'Other']),
  amount: z.coerce.number().min(0, 'Amount must be a positive number'),
  date: z.date(),
  responsiblePerson: z.string().nonempty(),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  closeDialog: (open: boolean) => void;
}

export function ExpenseForm({ closeDialog }: ExpenseFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseType: 'Other',
      amount: 0,
      date: new Date(),
      responsiblePerson: user?.profile?.name ?? user?.email ?? '',
      notes: '',
    },
  });

  async function onSubmit(values: ExpenseFormValues) {
    if (!user) return toast({ variant: 'destructive', title: 'Not logged in' });
    setIsSubmitting(true);

    const expenseDetails: ExpenseDetails = {
      expenseType: values.expenseType,
      amount: values.amount,
    };
    
    const actionData: Omit<Action<'Expenses'>, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'priority' | 'deadline'> = {
        category: 'Expenses',
        status: 'Done',
        assignedTo: user.uid,
        date: values.date,
        notes: values.notes,
        details: expenseDetails
    };

    try {
        const actionRef = await addDoc(collection(db, `users/${user.uid}/actions`), {
            ...actionData,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        const transactionData: Omit<Transaction, 'id' | 'createdAt'> = {
            userId: user.uid,
            type: 'expense',
            category: values.expenseType,
            amount: values.amount,
            date: values.date,
            description: `Expense: ${values.notes || values.expenseType}`,
            relatedActionId: actionRef.id,
        };

        await addDoc(collection(db, `users/${user.uid}/transactions`), {
            ...transactionData,
            createdAt: serverTimestamp(),
        });


        toast({ title: 'Success', description: 'Expense logged.' });
        closeDialog(false);
    } catch (error) {
        console.error("Error logging expense:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not log expense.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="expenseType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Expense Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
                    <FormLabel>Amount (LKR)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
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
                        <PopoverTrigger asChild><FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="responsiblePerson"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Responsible Person</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="e.g. Facebook ad campaign for Q3" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => closeDialog(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Expense
            </Button>
        </div>
      </form>
    </Form>
  );
}
