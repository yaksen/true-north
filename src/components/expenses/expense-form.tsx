
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PersonalExpense, PersonalWallet, PersonalExpenseCategory } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, writeBatch, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, CalendarIcon, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { format, addDays, parseISO } from 'date-fns';
import { useCurrency } from '@/context/CurrencyContext';
import { CurrencyInput } from '../ui/currency-input';
import { Switch } from '../ui/switch';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { extractFinanceDetails, type ExtractFinanceDetailsOutput } from '@/ai/flows/extract-finance-details-flow';

const formSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  categoryId: z.string().nonempty("Category is required."),
  amount: z.coerce.number().positive('Amount must be positive.'),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  date: z.date(),
  note: z.string().optional(),
  paidFromWallet: z.boolean().default(true), // Always true now
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  wallet: PersonalWallet | null;
  categories: PersonalExpenseCategory[];
  closeForm: () => void;
}

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};


export function ExpenseForm({ wallet, categories, closeForm }: ExpenseFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { globalCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImage, setAiImage] = useState<File | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      categoryId: '',
      amount: 0,
      currency: (globalCurrency as 'LKR' | 'USD' | 'EUR' | 'GBP') || 'USD',
      date: new Date(),
      note: '',
      paidFromWallet: true,
    },
  });
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setAiImage(event.target.files[0]);
    }
  };
  
  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleExtractDetails = async () => {
    if (!aiPrompt && !aiImage) {
        toast({
            variant: 'destructive',
            title: 'No Input Provided',
            description: 'Please provide some text or an image for the AI to process.'
        });
        return;
    }

    setIsExtracting(true);
    try {
        const imageDataUri = aiImage ? await fileToDataUri(aiImage) : undefined;
        
        const extractedData: ExtractFinanceDetailsOutput = await extractFinanceDetails({
            prompt: aiPrompt,
            imageDataUri: imageDataUri
        });

        if (extractedData.description) form.setValue('title', extractedData.description);
        if (extractedData.amount) form.setValue('amount', extractedData.amount);
        if (extractedData.currency) form.setValue('currency', extractedData.currency);
        if (extractedData.date) form.setValue('date', parseISO(extractedData.date));
        if (extractedData.category) {
            const matchedCategory = categories.find(c => c.name.toLowerCase() === extractedData.category!.toLowerCase());
            if (matchedCategory) {
                form.setValue('categoryId', matchedCategory.id);
            }
        }
        
        toast({
            title: 'Details Extracted',
            description: 'The AI has filled the form with the extracted details. Please review them.'
        });

    } catch (error) {
        console.error('Error extracting finance details:', error);
        toast({
            variant: 'destructive',
            title: 'Extraction Failed',
            description: 'The AI could not extract details. Please try again.'
        });
    } finally {
        setIsExtracting(false);
    }
  };

  async function onSubmit(values: ExpenseFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }
    
    if (!wallet) {
        toast({ variant: 'destructive', title: 'No Wallet Found', description: 'A personal wallet is required to add expenses.' });
        return;
    }

    const expenseAmountInWalletCurrency = convert(values.amount, values.currency, wallet.currency);

    if (wallet.balance < expenseAmountInWalletCurrency) {
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
            paidFromWallet: true, // Explicitly set to true
            createdAt: serverTimestamp(),
        });

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
      
        await batch.commit();
        toast({ title: 'Success', description: 'Expense added and wallet updated.' });
        closeForm();
    } catch (error) {
        console.error('Error adding personal expense:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add expense.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className='grid md:grid-cols-2 gap-8'>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="categoryId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a category..." />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                            <span className='mr-2'>{cat.emoji}</span> {cat.name}
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
                    <div className="p-2 border-t flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => field.onChange(new Date())}>Today</Button>
                        <Button size="sm" variant="ghost" onClick={() => field.onChange(addDays(new Date(), 1))}>Tomorrow</Button>
                        <Button size="sm" variant="ghost" onClick={() => field.onChange(addDays(new Date(), 2))}>Day After</Button>
                    </div>
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
            <Button type="submit" disabled={isSubmitting || !wallet}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Expense
            </Button>
            </div>
        </form>
        </Form>
        <Card className='h-fit'>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    <Sparkles className='h-5 w-5 text-primary' />
                    AI Assistant
                </CardTitle>
                <CardDescription>
                    Paste text from a receipt or upload an image to automatically fill the form.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="ai-prompt">Text or Prompt</Label>
                    <Textarea
                        id="ai-prompt"
                        placeholder="e.g., 'Lunch meeting with client, $45.50 on Oct 23'"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="h-24"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ai-image">Image (e.g., Receipt)</Label>
                    <Input id="ai-image" type="file" accept="image/*" onChange={handleFileChange} />
                </div>
                <Button className='w-full' onClick={handleExtractDetails} disabled={isExtracting}>
                    {isExtracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Extract Details
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
