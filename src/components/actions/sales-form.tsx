
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
import type { Lead, Service, Package, Action, SalesDetails } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const salesSchema = z.object({
  leadId: z.string().nonempty({ message: 'A customer must be selected' }),
  productOrService: z.string().nonempty({ message: 'Product/Service is required' }),
  amount: z.coerce.number().min(0, 'Amount must be a positive number'),
  date: z.date(),
  status: z.enum(['Pending', 'Won', 'Lost']),
  assignedTo: z.string().nonempty(),
  notes: z.string().optional(),
});

type SalesFormValues = z.infer<typeof salesSchema>;

interface SalesFormProps {
  leads: Lead[];
  services: Service[];
  packages: Package[];
  closeDialog: (open: boolean) => void;
}

export function SalesForm({ leads, services, packages, closeDialog }: SalesFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SalesFormValues>({
    resolver: zodResolver(salesSchema),
    defaultValues: {
      leadId: '',
      productOrService: '',
      amount: 0,
      date: new Date(),
      status: 'Pending',
      assignedTo: user?.uid ?? '',
      notes: '',
    },
  });

  async function onSubmit(values: SalesFormValues) {
    if (!user) return toast({ variant: 'destructive', title: 'Not logged in' });
    setIsSubmitting(true);

    const salesDetails: SalesDetails = {
      leadId: values.leadId,
      productOrService: values.productOrService,
      amount: values.amount,
    };

    const actionData: Omit<Action<'Sales'>, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
        category: 'Sales',
        status: values.status,
        assignedTo: values.assignedTo,
        date: values.date,
        notes: values.notes,
        details: salesDetails,
    };

    try {
        await addDoc(collection(db, `users/${user.uid}/actions`), {
            ...actionData,
            userId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        toast({ title: 'Success', description: 'Sales activity logged.' });
        closeDialog(false);
    } catch (error) {
        console.error("Error logging sales activity:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not log sales activity.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="leadId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lead/Customer</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {leads.map(lead => <SelectItem key={lead.id} value={lead.id}>{lead.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="productOrService"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product / Service</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Wedding Package" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
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
        </div>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Won">Won</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="Add any notes..." {...field} /></FormControl>
                <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => closeDialog(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Sale
            </Button>
        </div>
      </form>
    </Form>
  );
}
