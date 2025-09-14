
'use client';

import { useMemo, useState } from 'react';
import type { PersonalExpense, PersonalWallet, PersonalExpenseCategory } from '@/lib/types';
import { useCurrency } from '@/context/CurrencyContext';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, SlidersHorizontal, Settings } from 'lucide-react';
import { ExpenseForm } from './expense-form';
import { ExpenseCategoryChart } from './expense-category-chart';
import { RecentExpensesList } from './recent-expenses-list';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ExpenseCategoryManager } from './expense-category-manager';

type DateFilterPreset = 'this-month' | 'last-month' | 'custom';

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};

export function PersonalExpenseCard({ expenses, wallet, categories }: { expenses: PersonalExpense[], wallet: PersonalWallet | null, categories: PersonalExpenseCategory[] }) {
    const { globalCurrency } = useCurrency();
    const displayCurrency = globalCurrency || 'USD';
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    
    const [dateFilterPreset, setDateFilterPreset] = useState<DateFilterPreset>('this-month');
    const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

    const dateRange = useMemo(() => {
        const now = new Date();
        if (dateFilterPreset === 'this-month') {
            return { from: startOfMonth(now), to: endOfMonth(now) };
        }
        if (dateFilterPreset === 'last-month') {
            const lastMonth = subMonths(now, 1);
            return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        }
        return customDateRange;
    }, [dateFilterPreset, customDateRange]);

    const filteredExpenses = useMemo(() => {
        if (!dateRange || !dateRange.from) return expenses;
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= dateRange.from! && expenseDate <= (dateRange.to || new Date());
        });
    }, [expenses, dateRange]);


    const { totalSpent, categoryTotals } = useMemo(() => {
        let total = 0;
        const categoryTotals: { [key: string]: number } = {};

        for (const expense of filteredExpenses) {
            const convertedAmount = convert(expense.amount, expense.currency, displayCurrency);
            total += convertedAmount;
            const categoryName = categories.find(c => c.id === expense.categoryId)?.name || expense.category || 'Uncategorized';
            categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + convertedAmount;
        }

        return { totalSpent: total, categoryTotals };
    }, [filteredExpenses, displayCurrency, categories]);

    const chartData = useMemo(() => {
        return Object.entries(categoryTotals).map(([name, value]) => ({ name, value, fill: '' }));
    }, [categoryTotals]);

    const recentExpenses = useMemo(() => {
        return [...filteredExpenses].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [filteredExpenses]);


    return (
        <Card className='flex flex-col h-full'>
            <CardHeader>
                <div className='flex justify-between items-center'>
                    <div>
                        <CardTitle>Personal Expenses</CardTitle>
                        <CardDescription>Your personal spending tracker.</CardDescription>
                    </div>
                     <div className='flex gap-2'>
                        <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline"><Settings className='mr-2 h-4 w-4' /> Categories</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Manage Expense Categories</DialogTitle></DialogHeader>
                                <ExpenseCategoryManager categories={categories} />
                            </DialogContent>
                        </Dialog>
                         <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" ><PlusCircle className='mr-2' /> Add</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add Personal Expense</DialogTitle></DialogHeader>
                                <ExpenseForm wallet={wallet} categories={categories} closeForm={() => setIsFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                     </div>
                </div>
            </CardHeader>
            <CardContent className='flex-1 flex flex-col justify-between'>
                <div>
                    <div className='flex gap-2 mb-4'>
                        <Select value={dateFilterPreset} onValueChange={(v) => setDateFilterPreset(v as DateFilterPreset)}>
                            <SelectTrigger className='h-9'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='this-month'>This Month</SelectItem>
                                <SelectItem value='last-month'>Last Month</SelectItem>
                                <SelectItem value='custom'>Custom Range</SelectItem>
                            </SelectContent>
                        </Select>
                        {dateFilterPreset === 'custom' && (
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9">
                                        <SlidersHorizontal className="mr-2 h-4 w-4" /> Date Range
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={customDateRange?.from}
                                        selected={customDateRange}
                                        onSelect={setCustomDateRange}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                    <div className="text-center mb-6">
                        <p className="text-sm text-muted-foreground">Total Spent</p>
                        <p className="text-3xl font-bold">{formatCurrency(totalSpent, displayCurrency)}</p>
                    </div>
                    
                    <div className='mb-6'>
                        <h3 className='text-sm font-medium mb-2 text-center'>By Category</h3>
                        <ExpenseCategoryChart data={chartData} currency={displayCurrency} />
                    </div>
                </div>

                <div>
                    <h3 className='text-sm font-medium mb-2'>Recent Expenses</h3>
                    <RecentExpensesList expenses={recentExpenses} categories={categories} currency={displayCurrency} />
                </div>
            </CardContent>
        </Card>
    );
}
