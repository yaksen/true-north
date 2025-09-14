
'use client';

import { PersonalExpense } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface RecentExpensesListProps {
  expenses: PersonalExpense[];
  currency: string;
}

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};

export function RecentExpensesList({ expenses, currency }: RecentExpensesListProps) {
  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No recent expenses to show.</p>;
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <div key={expense.id} className="flex items-center">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">{expense.title}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(expense.date), 'PPP')}</p>
          </div>
          <div className="font-medium text-right">
            <div>{formatCurrency(convert(expense.amount, expense.currency, currency), currency)}</div>
            {expense.currency !== currency && (
                <div className='text-xs text-muted-foreground'>{formatCurrency(expense.amount, expense.currency)}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
