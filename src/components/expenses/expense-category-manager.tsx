
'use client';

import { useState } from 'react';
import type { PersonalExpenseCategory } from '@/lib/types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { ExpenseCategoryForm } from './expense-category-form';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
import { ScrollArea } from '../ui/scroll-area';

interface ExpenseCategoryManagerProps {
    categories: PersonalExpenseCategory[];
}

export function ExpenseCategoryManager({ categories }: ExpenseCategoryManagerProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<PersonalExpenseCategory | undefined>();

    const handleEdit = (category: PersonalExpenseCategory) => {
        setEditingCategory(category);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingCategory(undefined);
        setIsFormOpen(true);
    };

    const handleDelete = async (categoryId: string) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'personalExpenseCategories', categoryId));
            toast({ title: 'Success', description: 'Category deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete category.' });
        }
    };
    
    return (
        <div>
            <div className="flex justify-end mb-4">
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add New</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? 'Edit' : 'Create'} Category</DialogTitle>
                        </DialogHeader>
                        <ExpenseCategoryForm
                            category={editingCategory}
                            closeForm={() => setIsFormOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <ScrollArea className="h-72">
                <div className="space-y-2">
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <span className="text-xl" style={{ color: cat.color }}>{cat.emoji}</span>
                                <span className="font-medium">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete the category. Expenses using this category will not be deleted but will become uncategorized.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(cat.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <p className='text-center text-muted-foreground py-8'>No categories created yet.</p>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
