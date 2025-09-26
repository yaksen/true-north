

'use client';

import { useState } from 'react';
import type { Category } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { CategoryForm } from './category-form';
import { Edit, Trash2, Star, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activity-log';

interface CategoryCardProps {
  category: Category;
  onStar: (id: string, starred: boolean) => void;
}

export function CategoryCard({ category, onStar }: CategoryCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    if (!user) return;
    
    // Check for dependencies
    const servicesQuery = query(collection(db, 'services'), where('categoryId', '==', category.id));
    const productsQuery = query(collection(db, 'products'), where('categoryId', '==', category.id));

    const [servicesSnapshot, productsSnapshot] = await Promise.all([getDocs(servicesQuery), getDocs(productsQuery)]);
    
    if (!servicesSnapshot.empty || !productsSnapshot.empty) {
        toast({
            variant: 'destructive',
            title: 'Cannot delete category',
            description: `This category is used by ${servicesSnapshot.size} service(s) and ${productsSnapshot.size} product(s). Please re-assign them first.`,
        });
        return;
    }

    try {
        await deleteDoc(doc(db, 'categories', category.id));
        await logActivity(category.projectId, 'category_deleted', { name: category.name }, user.uid);
        toast({ title: 'Success', description: 'Category deleted.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete category.' });
    }
  };

  return (
    <Card className="flex flex-col">
        <CardHeader>
            <div className="flex justify-between items-start">
                <CardTitle className="truncate flex items-center gap-2">
                    <Tag className="h-5 w-5 text-muted-foreground" />
                    {category.name}
                </CardTitle>
                <div className='flex items-center -mr-2'>
                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStar(category.id, !category.starred)}>
                        <Star className={cn("h-4 w-4", category.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                    </Button>
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent className='max-w-4xl'>
                            <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
                            <CategoryForm category={category} projectId={category.projectId} closeForm={() => setIsEditOpen(false)} />
                        </DialogContent>
                    </Dialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
            <CardDescription>{category.sku}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-2">{category.notes || 'No notes for this category.'}</p>
        </CardContent>
    </Card>
  );
}
