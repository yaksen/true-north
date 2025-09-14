
'use client';

import { PersonalExpense, PersonalExpenseCategory } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface RecentExpensesListProps {
  expenses: PersonalExpense[];
  categories: PersonalExpenseCategory[];
  currency: string;
  totalSpent: number;
}

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};

export function RecentExpensesList({ expenses, categories, currency, totalSpent }: RecentExpensesListProps) {
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
            <div key={expense.id} className="flex items-center gap-3 p-2 rounded-lg relative overflow-hidden">
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
            </div>
        )
      })}
    </div>
  );
}
