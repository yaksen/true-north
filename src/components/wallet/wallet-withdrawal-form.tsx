
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

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};

const formSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive.'),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  destinationProjectId: z.string().nonempty('You must select a destination project.'),
  note: z.string().optional(),
});

type WithdrawalFormValues = z.infer<typeof formSchema>;

interface WalletWithdrawalFormProps {
  wallet: PersonalWallet;
  projects: Project[];
  closeForm: () => void;
}

export function WalletWithdrawalForm({ wallet, projects, closeForm }: WalletWithdrawalFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WithdrawalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      currency: wallet.currency,
      destinationProjectId: '',
      note: '',
    },
  });

  const watchAmount = form.watch('amount');
  const watchCurrency = form.watch('currency');
  const amountInWalletCurrency = convert(watchAmount, watchCurrency, wallet.currency);


  async function onSubmit(values: WithdrawalFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }

    if (amountInWalletCurrency > wallet.balance) {
        toast({ variant: 'destructive', title: 'Insufficient Funds', description: 'Withdrawal amount cannot exceed your wallet balance.' });
        return;
    }

    setIsSubmitting(true);
    const batch = writeBatch(db);

    try {
        const destinationProject = projects.find(p => p.id === values.destinationProjectId);
        if (!destinationProject) {
            throw new Error("Destination project not found");
        }
        
        // 1. Create a finance record in the destination project
        const incomeAmount = convert(values.amount, values.currency, destinationProject.currency);
        const financeRecord: Omit<Finance, 'id'> = {
            projectId: values.destinationProjectId,
            type: 'income',
            amount: incomeAmount,
            currency: destinationProject.currency,
            description: `Funds transferred from personal wallet on ${format(new Date(), 'PPP')}`,
            date: new Date(),
            category: 'Wallet Transfer',
            recordedByUid: user.uid,
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
        };
        const financeRef = doc(collection(db, 'finances'));
        batch.set(financeRef, financeRecord);

        // 2. Create an expense transaction record for the wallet
        const transactionRef = doc(collection(db, 'walletTransactions'));
        batch.set(transactionRef, {
            walletId: wallet.id,
            amount: amountInWalletCurrency,
            type: 'expense',
            destinationProjectId: values.destinationProjectId,
            note: values.note,
            timestamp: serverTimestamp(),
        });
        
        // 3. Update the wallet balance
        const walletRef = doc(db, 'personalWallets', wallet.id);
        batch.update(walletRef, {
            balance: increment(-amountInWalletCurrency),
            updatedAt: serverTimestamp(),
        });
        
        await batch.commit();

        toast({ title: 'Success!', description: 'Funds removed from your wallet successfully.' });
        closeForm();

    } catch (error) {
        console.error('Error removing funds from wallet:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not remove funds from wallet.' });
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
              <FormLabel>Amount to Remove</FormLabel>
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
          name="destinationProjectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destination Project</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project to transfer to..." />
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
                <Textarea placeholder="e.g. For project expenses" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove Funds
          </Button>
        </div>
      </form>
    </Form>
  );
}
