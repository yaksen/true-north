
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { Project, PersonalWallet, Finance } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CurrencyInput } from '../ui/currency-input';
import { format } from 'date-fns';

const formSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive.'),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  sourceProjectId: z.string().nonempty('You must select a source project.'),
  note: z.string().optional(),
});

type FundingFormValues = z.infer<typeof formSchema>;

interface WalletFundingFormProps {
  wallet: PersonalWallet;
  projects: Project[];
  closeForm: () => void;
}

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};

export function WalletFundingForm({ wallet, projects, closeForm }: WalletFundingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FundingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      currency: 'USD',
      sourceProjectId: '',
      note: '',
    },
  });

  async function onSubmit(values: FundingFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    setIsSubmitting(true);
    const batch = writeBatch(db);

    try {
        const amountInWalletCurrency = convert(values.amount, values.currency, wallet.currency);
        
        // 1. Create a finance record in the source project
        const financeRecord: Omit<Finance, 'id'> = {
            projectId: values.sourceProjectId,
            type: 'expense',
            amount: values.amount,
            currency: values.currency,
            description: `Funds transferred to personal wallet on ${format(new Date(), 'PPP')}`,
            date: new Date(),
            category: 'Wallet Transfer',
            recordedByUid: user.uid,
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
        };
        const financeRef = doc(collection(db, 'finances'));
        batch.set(financeRef, financeRecord);

        // 2. Create a transaction record for the wallet
        const transactionRef = doc(collection(db, 'walletTransactions'));
        batch.set(transactionRef, {
            walletId: wallet.id,
            amount: amountInWalletCurrency,
            type: 'add',
            sourceProjectId: values.sourceProjectId,
            note: values.note,
            timestamp: serverTimestamp(),
        });
        
        // 3. Update the wallet balance
        const walletRef = doc(db, 'personalWallets', wallet.id);
        batch.update(walletRef, {
            balance: increment(amountInWalletCurrency),
            updatedAt: serverTimestamp(),
        });
        
        await batch.commit();

        toast({ title: 'Success!', description: 'Funds added to your wallet successfully.' });
        closeForm();

    } catch (error) {
        console.error('Error adding funds to wallet:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add funds to wallet.' });
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
              <FormLabel>Amount to Add</FormLabel>
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
          name="sourceProjectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source Project</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project to transfer from..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Textarea placeholder="e.g. For upcoming travel expenses" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Funds
          </Button>
        </div>
      </form>
    </Form>
  );
}
