
'use client';

import { useMemo, useState } from "react";
import { Project, Finance, FinanceType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { PlusCircle, SlidersHorizontal } from "lucide-react";
import { DataTable } from "../ui/data-table";
import { financeColumns } from "./finance-columns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { FinanceForm } from "./finance-form";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DateRange } from "react-day-picker";
import { Calendar } from "../ui/calendar";
import { format } from "date-fns";

interface ProjectFinanceProps {
    project: Project;
    finances: Finance[];
}

export function ProjectFinance({ project, finances }: ProjectFinanceProps) {
    const [isFinanceFormOpen, setIsFinanceFormOpen] = useState(false);
    const [typeFilter, setTypeFilter] = useState<FinanceType | 'all'>('all');
    const [dateFilter, setDateFilter] = useState<DateRange | undefined>();

    const filteredFinances = useMemo(() => {
        return finances.filter(f => {
            const typeMatch = typeFilter === 'all' || f.type === typeFilter;
            const dateMatch = !dateFilter || (
                (!dateFilter.from || new Date(f.date) >= dateFilter.from) &&
                (!dateFilter.to || new Date(f.date) <= dateFilter.to)
            );
            return typeMatch && dateMatch;
        });
    }, [finances, typeFilter, dateFilter]);
    
    const Toolbar = () => (
        <div className="flex gap-2">
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
            {(typeFilter !== 'all' || dateFilter) && (
                <Button variant="ghost" size="sm" onClick={() => { setTypeFilter('all'); setDateFilter(undefined); }}>
                    Clear Filters
                </Button>
            )}
        </div>
    );

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
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Financial Record</DialogTitle>
                                </DialogHeader>
                                <FinanceForm project={project} closeForm={() => setIsFinanceFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <DataTable columns={financeColumns} data={filteredFinances} toolbar={<Toolbar />} />
                </CardContent>
            </Card>
        </div>
    )
}
