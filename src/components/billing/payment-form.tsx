
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Invoice, Payment, PaymentMethod, Project, InvoiceStatus, Finance } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, arrayUnion, serverTimestamp, getDocs, collection, query, where, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { logActivity } from '@/lib/activity-log';
import { v4 as uuidv4 } from 'uuid';
import { CurrencyInput } from '../ui/currency-input';

const paymentMethods: PaymentMethod[] = ['cash', 'bank transfer', 'online', 'other'];

const formSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Amount must be positive.' }),
  date: z.date({ required_error: 'A date is required.' }),
  method: z.enum(paymentMethods),
  note: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof formSchema>;

interface PaymentFormProps {
  invoice: Invoice;
  project: Project;
  closeForm: () => void;
}

export function PaymentForm({ invoice, project, closeForm }: PaymentFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      date: new Date(),
      method: 'cash',
      note: '',
    },
  });

  async function onSubmit(values: PaymentFormValues) {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
        const batch = writeBatch(db);
        const invoiceRef = doc(db, 'invoices', invoice.id);
      
        const newPayment: Payment = {
            id: uuidv4(),
            date: values.date,
            amount: values.amount,
            method: values.method,
            note: values.note,
        };

        // --- 1. Update Invoice ---
        const updatedPaymentsArray = arrayUnion(newPayment);
        
        const currentPayments = invoice.payments || [];
        const totalPaid = currentPayments.reduce((sum, p) => sum + p.amount, 0) + newPayment.amount;
        
        const invoiceTotal = invoice.lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        let newStatus: InvoiceStatus = 'partial';
        if (totalPaid >= invoiceTotal) {
            newStatus = 'paid';
        } else if (totalPaid <= 0) {
            newStatus = 'unpaid';
        }

        batch.update(invoiceRef, {
            payments: updatedPaymentsArray,
            status: newStatus,
            updatedAt: serverTimestamp(),
        });

        // --- 2. Create a NEW Finance record for this specific payment ---
        const financeRecord = {
            projectId: invoice.projectId,
            leadId: invoice.leadId,
            invoiceId: invoice.id,
            type: 'income' as const,
            amount: values.amount, // The amount of this specific payment
            currency: project.currency,
            description: `Payment for Invoice ${invoice.invoiceNumber}${values.note ? ` - Note: ${values.note}`: ''}`,
            date: values.date,
            category: 'Invoice Payment',
            recordedByUid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const newFinanceRef = doc(collection(db, 'finances'));
        batch.set(newFinanceRef, financeRecord);
        
        // --- 3. Commit Batch and Log Activity ---
        await batch.commit();

        await logActivity(invoice.projectId, 'payment_added', { 
            invoiceNumber: invoice.invoiceNumber, 
            amount: formatCurrency(values.amount, project.currency),
        }, user.uid);
        
        await logActivity(invoice.projectId, 'finance_created', {
            description: financeRecord.description
        }, user.uid);

        toast({ title: 'Success', description: 'Payment added and finance record created.' });
        closeForm();
    } catch (error) {
        console.error("Error adding payment: ", error);
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <CurrencyInput
                  value={field.value}
                  onValueChange={field.onChange}
                  currency={project.currency}
                  onCurrencyChange={() => {}} // Currency is fixed to project currency
                  readOnlyCurrency
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        {paymentMethods.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. Cleared remaining balance" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Payment
          </Button>
        </div>
      </form>
    </Form>
  );
}
