
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PersonalExpense, PersonalWallet } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, writeBatch, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useCurrency } from '@/context/CurrencyContext';
import { CurrencyInput } from '../ui/currency-input';
import { Switch } from '../ui/switch';
import { v4 as uuidv4 } from 'uuid';

const expenseCategories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'] as const;

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};


const formSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  category: z.string().nonempty("Category is required."),
  amount: z.coerce.number().positive('Amount must be positive.'),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  date: z.date(),
  note: z.string().optional(),
  paidFromWallet: z.boolean().default(false),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  wallet: PersonalWallet | null;
  closeForm: () => void;
}

export function ExpenseForm({ wallet, closeForm }: ExpenseFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { globalCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      category: 'Food',
      amount: 0,
      currency: (globalCurrency as 'LKR' | 'USD' | 'EUR' | 'GBP') || 'USD',
      date: new Date(),
      note: '',
      paidFromWallet: false,
    },
  });

  const watchPaidFromWallet = form.watch('paidFromWallet');
  const watchAmount = form.watch('amount');
  const watchCurrency = form.watch('currency');

  async function onSubmit(values: ExpenseFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    const expenseAmountInWalletCurrency = convert(values.amount, values.currency, wallet?.currency || 'USD');

    if (values.paidFromWallet && (!wallet || wallet.balance < expenseAmountInWalletCurrency)) {
        toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Your wallet balance is too low for this transaction.' });
        return;
    }
    
    setIsSubmitting(true);
    const batch = writeBatch(db);

    try {
        const newExpenseRef = doc(collection(db, 'personalExpenses'));
        batch.set(newExpenseRef, {
            ...values,
            userId: user.uid,
            createdAt: serverTimestamp(),
        });

        if (values.paidFromWallet && wallet) {
            const walletRef = doc(db, 'personalWallets', wallet.id);
            batch.update(walletRef, {
                balance: increment(-expenseAmountInWalletCurrency),
                updatedAt: serverTimestamp(),
            });

            const transactionRef = doc(collection(db, 'walletTransactions'));
            batch.set(transactionRef, {
                walletId: wallet.id,
                amount: expenseAmountInWalletCurrency,
                type: 'expense',
                expenseId: newExpenseRef.id,
                note: `Paid for: ${values.title}`,
                timestamp: serverTimestamp(),
            });
        }
      
        await batch.commit();
        toast({ title: 'Success', description: 'Expense added successfully.' });
        closeForm();
    } catch (error) {
        console.error('Error adding personal expense:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add expense.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {wallet && (
            <FormField
                control={form.control}
                name="paidFromWallet"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <FormLabel>Pay from Personal Wallet</FormLabel>
                            <FormMessage />
                        </div>
                        <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!wallet || wallet.balance <= 0}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />
        )}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Lunch with team" {...field} />
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
                <FormLabel>Amount</FormLabel>
                <CurrencyInput
                  value={field.value}
                  onValueChange={field.onChange}
                  currency={form.watch('currency')}
                  onCurrencyChange={(c) => form.setValue('currency', c)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
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
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                    >
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any details about this expense..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Expense
          </Button>
        </div>
      </form>
    </Form>
  );
}
