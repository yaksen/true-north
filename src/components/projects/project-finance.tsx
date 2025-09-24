
'use client';

import { useMemo, useState } from "react";
import { Project, Finance, FinanceType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { FinanceForm } from "./finance-form";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { FinanceToolbar } from "../finance/finance-toolbar";
import { FinanceCard } from "../finance/finance-card";
import { ScrollArea } from "../ui/scroll-area";

interface ProjectFinanceProps {
    project: Project;
    finances: Finance[];
}

export function ProjectFinance({ project, finances }: ProjectFinanceProps) {
    const { toast } = useToast();
    const [isFinanceFormOpen, setIsFinanceFormOpen] = useState(false);
    const { globalCurrency } = useCurrency();
    const displayCurrency = globalCurrency || project.currency;
    const [filters, setFilters] = useState({
        type: 'all' as FinanceType | 'all',
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
    

    return (
        <div className="grid gap-6 mt-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Finance Ledger</CardTitle>
                            <CardDescription>All financial records for the &quot;{project.name}&quot; project.</CardDescription>
                        </div>
                        <Dialog open={isFinanceFormOpen} onOpenChange={setIsFinanceFormOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm"><PlusCircle className="mr-2"/> Add Record</Button>
                            </DialogTrigger>
                            <DialogContent className='max-w-4xl'>
                                <DialogHeader>
                                    <DialogTitle>Add New Financial Record</DialogTitle>
                                </DialogHeader>
                                <FinanceForm project={project} closeForm={() => setIsFinanceFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <FinanceToolbar onFilterChange={setFilters} />
                     <ScrollArea className="h-[calc(100vh-30rem)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                            {filteredFinances.map(finance => (
                                <FinanceCard
                                    key={finance.id}
                                    finance={finance}
                                    displayCurrency={displayCurrency}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                    {filteredFinances.length === 0 && (
                        <div className="text-center text-muted-foreground py-12">
                            <p>No financial records found for the selected filters.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
