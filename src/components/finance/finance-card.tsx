
'use client';

import type { Finance } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { Button } from '../ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { FinanceForm } from '../projects/finance-form';
import { useToast } from '@/hooks/use-toast';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

interface FinanceCardProps {
    finance: Finance;
    displayCurrency: string;
}

// Mock conversion rates - replace with a real API call in a real app
const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };

const convert = (amount: number, from: string, to: string) => {
    const fromRate = MOCK_RATES[from] || 1;
    const toRate = MOCK_RATES[to] || 1;
    return (amount / fromRate) * toRate;
};

export function FinanceCard({ finance, displayCurrency }: FinanceCardProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);

    const convertedAmount = convert(finance.amount, finance.currency, displayCurrency);
    const isIncome = finance.type === 'income';

    const handleDelete = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: "Not authenticated" });
            return;
        }
        try {
            await deleteDoc(doc(db, 'finances', finance.id));
            toast({ title: "Success", description: "Finance record deleted."})
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete record."})
        }
    };

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-2">
                <div className='flex justify-between items-start'>
                    <div className={cn("p-2 rounded-full", isIncome ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500')}>
                        {isIncome ? <ArrowDownLeft className='h-5 w-5' /> : <ArrowUpRight className='h-5 w-5' />}
                    </div>
                     <div className="flex items-center">
                        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Edit Finance Record</DialogTitle></DialogHeader>
                                <FinanceForm finance={finance} closeForm={() => setIsEditOpen(false)} />
                            </DialogContent>
                        </Dialog>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this financial record. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <CardTitle className={cn("text-2xl font-bold", isIncome ? 'text-green-400' : 'text-red-400')}>
                    {isIncome ? '+' : '-'} {formatCurrency(convertedAmount, displayCurrency)}
                </CardTitle>
                <CardDescription className='line-clamp-2 mt-1'>{finance.description}</CardDescription>
            </CardContent>
            <CardFooter className="p-6 pt-0 flex-grow flex justify-between items-end">
                {finance.category ? <Badge variant="secondary">{finance.category}</Badge> : <div />}
                <p className="text-xs text-muted-foreground">{format(new Date(finance.date), "PPP")}</p>
            </CardFooter>
        </Card>
    )
}
