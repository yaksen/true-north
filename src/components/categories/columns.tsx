
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Category } from '@/lib/types';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CategoryForm } from './category-form';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { EditableCell } from '../ui/editable-cell';

interface ColumnsProps {
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

export const getColumns = ({ setCategories }: ColumnsProps): ColumnDef<Category>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <EditableCell
        initialValue={row.original.name}
        onSave={(value) => {
            const categoryId = row.original.id;
            setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, name: value } : c));
            return { collection: 'categories', docId: categoryId, field: 'name', value };
        }}
    />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => {
      const date = row.getValue('createdAt') as Date;
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    id: 'actions',
    cell: function Actions({ row }) {
      const category = row.original;
      const { user } = useAuth();
      const { toast } = useToast();
      const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
      
      const userRole = user?.profile?.role;

      const handleDelete = async () => {
        if (!user) {
          toast({ variant: 'destructive', title: 'Not authenticated' });
          return;
        }
        try {
          await deleteDoc(doc(db, `users/${user.uid}/categories`, category.id));
          toast({ title: 'Category deleted successfully' });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error deleting category' });
        } finally {
          setIsDeleteDialogOpen(false);
        }
      };

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>Edit</DropdownMenuItem>
               {userRole === 'admin' && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={() => setIsDeleteDialogOpen(true)}
                        className="text-destructive"
                    >
                        Delete
                    </DropdownMenuItem>
                </>
               )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Category</DialogTitle>
                <DialogDescription>
                  Update the details of your category below.
                </DialogDescription>
              </DialogHeader>
              <CategoryForm category={category} closeForm={() => setIsEditDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this category.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      );
    },
  },
];
