
'use client';

import { PersonalExpense, PersonalExpenseCategory, PersonalWallet } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, deleteDoc, doc, getDocs, increment, query, where, writeBatch } from 'firebase/firestore';

interface RecentExpensesListProps {
  expenses: PersonalExpense[];
  categories: PersonalExpenseCategory[];
  currency: string;
  totalSpent: number;
  wallet: PersonalWallet | null;
}

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};

export function RecentExpensesList({ expenses, categories, currency, totalSpent, wallet }: RecentExpensesListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleDelete = async (expense: PersonalExpense) => {
    if (!user) {
        toast({ variant: 'destructive', title: "Not authenticated" });
        return;
    }
    const batch = writeBatch(db);

    try {
        // 1. Delete the expense document
        const expenseRef = doc(db, 'personalExpenses', expense.id);
        batch.delete(expenseRef);

        // 2. If paid from wallet, refund the wallet
        if (expense.paidFromWallet && wallet) {
            const expenseAmountInWalletCurrency = convert(expense.amount, expense.currency, wallet.currency);
            
            // 2a. Find and delete the corresponding wallet transaction
            const transactionsQuery = query(
                collection(db, 'walletTransactions'),
                where('walletId', '==', wallet.id),
                where('expenseId', '==', expense.id)
            );
            const transactionSnapshot = await getDocs(transactionsQuery);
            if (!transactionSnapshot.empty) {
                const transactionRef = transactionSnapshot.docs[0].ref;
                batch.delete(transactionRef);
            }

            // 2b. Increment the wallet balance
            const walletRef = doc(db, 'personalWallets', wallet.id);
            batch.update(walletRef, {
                balance: increment(expenseAmountInWalletCurrency)
            });
        }
        
        await batch.commit();
        toast({ title: 'Success', description: 'Expense deleted successfully.' });

    } catch (error) {
        console.error("Error deleting expense:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the expense.' });
    }
  };

  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No recent expenses to show.</p>;
  }

  return (
    <div className="space-y-1">
      {expenses.map((expense) => {
        const category = categories.find(c => c.id === expense.categoryId);
        const convertedAmount = convert(expense.amount, expense.currency, currency);
        const percentage = totalSpent > 0 ? ((convertedAmount / totalSpent) * 100).toFixed(1) : '0.0';
        
        return (
            <div key={expense.id} className="group flex items-center gap-3 p-2 rounded-lg relative overflow-hidden hover:bg-muted/50">
              <div 
                className='absolute left-0 top-0 bottom-0 w-1'
                style={{ backgroundColor: category?.color || 'hsl(var(--muted))' }}
              />
              <div className='ml-3 text-xl'>{category?.emoji || '-'}</div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">{expense.title}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(expense.date), 'PPP')}</p>
              </div>
              <div className="text-right">
                <div className='font-medium'>{formatCurrency(convertedAmount, currency)}</div>
                <div className='text-xs font-semibold text-primary'>{percentage}%</div>
              </div>
               <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the expense &quot;{expense.title}&quot;. 
                        {expense.paidFromWallet && " The amount will be refunded to your wallet."} This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(expense)}>
                        Delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
        )
      })}
    </div>
  );
}
