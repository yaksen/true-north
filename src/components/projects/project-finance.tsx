'use client';

import { useMemo, useState } from "react";
import { Project, Finance, FinanceType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { financeColumns } from "./finance-columns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { FinanceForm } from "./finance-form";
import { DateRange } from "react-day-picker";
import { doc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { FinanceToolbar } from "../finance/finance-toolbar";

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

    const columns = useMemo(() => financeColumns(handleStar, displayCurrency), [displayCurrency]);

    const filteredFinances = useMemo(() => {
        return finances.filter(f => {
            const typeMatch = filters.type === 'all' || f.type === filters.type;
            const dateMatch = !filters.date || (
                (!filters.date.from || new Date(f.date) >= filters.date.from) &&
                (!filters.date.to || new Date(f.date) <= filters.date.to)
            );
            const categoryMatch = !filters.category || (f.category && f.category.toLowerCase().includes(filters.category.toLowerCase()));
            return typeMatch && dateMatch && categoryMatch;
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
                    <DataTable 
                        columns={columns} 
                        data={filteredFinances} 
                        toolbar={<FinanceToolbar onFilterChange={setFilters} />} 
                        onDeleteSelected={handleDeleteSelected}
                        globalFilter={filters.search}
                        setGlobalFilter={(value) => setFilters(prev => ({...prev, search: value}))}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
