
'use client';

import { useMemo, useState } from 'react';
import type { Project, Finance } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DataTable } from '@/components/ui/data-table';
import { financeColumns } from '@/components/projects/finance-columns';
import { Button } from '@/components/ui/button';
import { PlusCircle, SlidersHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FinanceForm } from '@/components/projects/finance-form';
import { Card, CardContent } from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { DateRange } from 'react-day-picker';
import { Calendar } from '../ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { doc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

type FinanceTypeFilter = 'all' | 'income' | 'expense';

interface GlobalFinanceClientProps {
  projects: Project[];
  finances: Finance[];
}

export function GlobalFinanceClient({ projects, finances }: GlobalFinanceClientProps) {
  const { toast } = useToast();
  const [isFinanceFormOpen, setIsFinanceFormOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>();
  const [typeFilter, setTypeFilter] = useState<FinanceTypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('');

  const handleStar = async (id: string, starred: boolean) => {
    try {
        await updateDoc(doc(db, 'finances', id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const handleDeleteSelected = async (ids: string[]) => {
      const batch = writeBatch(db);
      ids.forEach(id => {
          batch.delete(doc(db, 'finances', id));
      });
      try {
          await batch.commit();
          toast({ title: "Success", description: `${ids.length} record(s) deleted.`});
      } catch (error) {
          toast({ variant: 'destructive', title: "Error", description: "Could not delete selected records."})
      }
  }
  
  const columns = useMemo(() => financeColumns(handleStar), []);

  const filteredFinances = useMemo(() => {
    return finances.filter(f => {
        const dateMatch = !dateFilter || (
            (!dateFilter.from || new Date(f.date) >= dateFilter.from) &&
            (!dateFilter.to || new Date(f.date) <= dateFilter.to)
        );
        const typeMatch = typeFilter === 'all' || f.type === typeFilter;
        const categoryMatch = !categoryFilter || (f.category && f.category.toLowerCase().includes(categoryFilter.toLowerCase()));
        
        return dateMatch && typeMatch && categoryMatch;
    });
  }, [finances, dateFilter, typeFilter, categoryFilter]);


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
    const summaries: { [key: string]: { income: number; expense: number; net: number; currency: string } } = {};
    for (const project of projects) {
        const projectFinances = financesByProject[project.id] || [];
        const income = projectFinances.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
        const expense = projectFinances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);
        summaries[project.id] = {
            income,
            expense,
            net: income - expense,
            currency: project.currency,
        };
    }
    return summaries;
  }, [projects, financesByProject]);

  const defaultAccordionValues = useMemo(() => projects.filter(p => (financesByProject[p.id] || []).length > 0).map(p => p.id), [projects, financesByProject]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const clearFilters = () => {
    setDateFilter(undefined);
    setTypeFilter('all');
    setCategoryFilter('');
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4 mt-4">
        <div className="flex items-center gap-2">
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
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
            </Select>
             <Input 
                placeholder="Filter by category..."
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 w-48"
            />
            {(dateFilter || typeFilter !== 'all' || categoryFilter) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear Filters
                </Button>
            )}
        </div>
        <Dialog open={isFinanceFormOpen} onOpenChange={setIsFinanceFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> New Record
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                                        Net: {formatCurrency(summary.net, summary.currency)}
                                    </span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <DataTable 
                                columns={columns} 
                                data={projectFinances}
                                onDeleteSelected={handleDeleteSelected}
                            />
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
