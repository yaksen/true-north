
'use client';

import { useMemo, useState } from 'react';
import type { Project, Finance } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FinanceForm } from '@/components/projects/finance-form';
import { Card, CardContent } from '../ui/card';
import { useCurrency } from '@/context/CurrencyContext';
import { FinanceToolbar } from './finance-toolbar';
import type { DateRange } from 'react-day-picker';
import { ScrollArea } from '../ui/scroll-area';
import { FinanceCard } from './finance-card';

type FinanceTypeFilter = 'all' | 'income' | 'expense';

interface GlobalFinanceClientProps {
  projects: Project[];
  finances: Finance[];
}

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};

export function GlobalFinanceClient({ projects, finances }: GlobalFinanceClientProps) {
  const { globalCurrency } = useCurrency();
  const displayCurrency = globalCurrency || 'USD';
  const [isFinanceFormOpen, setIsFinanceFormOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    type: 'all' as FinanceTypeFilter,
    date: undefined as DateRange | undefined,
    category: '',
    search: '',
  });

  const filteredFinances = useMemo(() => {
    return finances.filter(f => {
        const typeMatch = filters.type === 'all' || f.type === filters.type;
        const dateMatch = !filters.date || (
            (!filters.date.from || new Date(f.date) >= filters.date.from) &&
            (!filters.date.to || new Date(f.date) <= filters.date.to)
        );
        const categoryMatch = !filters.category || (f.category && f.category.toLowerCase().includes(filters.category.toLowerCase()));
        const searchMatch = !filters.search || f.description.toLowerCase().includes(filters.search.toLowerCase());

        return typeMatch && dateMatch && categoryMatch && searchMatch;
    });
  }, [finances, filters]);


  const financesByProject = useMemo(() => {
    const grouped: { [key: string]: Finance[] } = {};
    for (const project of projects) {
      grouped[project.id] = [];
    }
    for (const finance of filteredFinances) {
      if (grouped[finance.projectId]) {
        grouped[finance.projectId].push(finance);
      }
    }
    return grouped;
  }, [projects, filteredFinances]);

  const projectSummaries = useMemo(() => {
    const summaries: { [key: string]: { income: number; expense: number; net: number } } = {};
    for (const project of projects) {
        const projectFinances = financesByProject[project.id] || [];
        const income = projectFinances
            .filter(f => f.type === 'income')
            .reduce((sum, f) => sum + convert(f.amount, f.currency, displayCurrency), 0);
        const expense = projectFinances
            .filter(f => f.type === 'expense')
            .reduce((sum, f) => sum + convert(f.amount, f.currency, displayCurrency), 0);
        summaries[project.id] = {
            income,
            expense,
            net: income - expense,
        };
    }
    return summaries;
  }, [projects, financesByProject, displayCurrency]);

  const defaultAccordionValues = useMemo(() => projects.filter(p => (financesByProject[p.id] || []).length > 0).map(p => p.id), [projects, financesByProject]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency }).format(amount);
  };

  return (
    <>
      <div className="flex justify-end mb-4 mt-4">
        <Dialog open={isFinanceFormOpen} onOpenChange={setIsFinanceFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> New Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Global Record</DialogTitle>
            </DialogHeader>
            <FinanceForm 
              projects={projects} 
              closeForm={() => setIsFinanceFormOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className='pt-6'>
            <FinanceToolbar onFilterChange={setFilters} />
            <Accordion type="multiple" defaultValue={defaultAccordionValues} className="w-full">
            {projects.map(project => {
                const summary = projectSummaries[project.id];
                const projectFinances = financesByProject[project.id] || [];
                if (projectFinances.length === 0) return null;

                return (
                    <AccordionItem value={project.id} key={project.id}>
                        <AccordionTrigger className='hover:no-underline px-4'>
                            <div className='flex flex-col items-start'>
                                <h3 className="font-semibold text-lg">{project.name}</h3>
                                <div className='text-sm text-muted-foreground flex items-center gap-4'>
                                    <span>{projectFinances.length} transaction(s)</span>
                                    <span className={`font-medium ${summary.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        Net: {formatCurrency(summary.net)}
                                    </span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <ScrollArea className="h-[calc(100vh-45rem)]">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                                    {projectFinances.map(finance => (
                                        <FinanceCard
                                            key={finance.id}
                                            finance={finance}
                                            displayCurrency={displayCurrency}
                                        />
                                    ))}
                                </div>
                            </ScrollArea>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
            </Accordion>
            {filteredFinances.length === 0 && (
                 <div className="text-center text-muted-foreground py-12">
                    <p>No financial records match your current filters.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}
