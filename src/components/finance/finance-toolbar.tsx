'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, SlidersHorizontal } from 'lucide-react';
import type { FinanceType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { findFinance, type FindFinanceOutput } from '@/ai/flows/find-finance-flow';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { DateRange } from 'react-day-picker';

interface FinanceToolbarProps {
    onFilterChange: (filters: { type: FinanceType | 'all', date: DateRange | undefined, category: string, search: string }) => void;
}

const financeTypes: (FinanceType | 'all')[] = ['all', 'income', 'expense'];

export function FinanceToolbar({ onFilterChange }: FinanceToolbarProps) {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<FinanceType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    const handler = setTimeout(() => {
        onFilterChange({
            type: typeFilter,
            category: categoryFilter,
            date: dateFilter,
            search: searchTerm,
        });
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, typeFilter, categoryFilter, dateFilter, onFilterChange]);


  const handleAiSearch = async () => {
    if (!searchTerm) {
        toast({ variant: 'destructive', title: 'No Input', description: 'Please provide a prompt.' });
        return;
    }
    setIsProcessing(true);
    
    try {
        const result: FindFinanceOutput = await findFinance({ prompt: searchTerm });

        setTypeFilter(result.type || 'all');
        setCategoryFilter(result.category || '');
        setSearchTerm(result.searchTerm || '');
        
        toast({ title: 'AI Search Complete', description: 'Filters have been updated.' });

    } catch (error) {
        console.error("AI Search Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not process the search query.' });
    } finally {
        setIsProcessing(false);
    }
  }

  const clearFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('');
    setDateFilter(undefined);
    setSearchTerm('');
  };

  return (
    <div className="flex flex-col gap-2 mb-4 p-4 border rounded-lg bg-card">
        <div className='flex gap-2 items-center'>
            <Sparkles className='h-5 w-5 text-primary flex-shrink-0' />
            <Input
                placeholder="Search descriptions or ask AI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
            />
            <Button size="sm" onClick={handleAiSearch} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                AI Search
            </Button>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t mt-2">
            <span className='text-sm font-medium text-muted-foreground'>Filters:</span>
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
                        defaultMonth={dateFilter?.from}
                        selected={dateFilter}
                        onSelect={setDateFilter}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
             <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
                <SelectTrigger className="w-32 h-9 text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {financeTypes.map(t => <SelectItem key={t} value={t} className='capitalize'>{t}</SelectItem>)}
                </SelectContent>
            </Select>
             <Input 
                placeholder="Filter by category..."
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 w-48"
            />
            <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
            </Button>
        </div>
    </div>
  );
}
