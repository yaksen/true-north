'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Service, Category } from '@/lib/types';
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
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ServiceForm } from './service-form';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export const getColumns = ({ categories }: { categories: Category[] }): ColumnDef<Service>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'categoryId',
    header: 'Category',
    cell: ({ row }) => {
      const categoryId = row.getValue('categoryId') as string;
      const category = categories.find((c) => c.id === categoryId);
      return <div>{category?.name ?? 'N/A'}</div>;
    },
  },
  {
    accessorKey: 'priceLKR',
    header: 'Price (LKR)',
    cell: ({ row }) => `Rs. ${row.getValue('priceLKR')}`,
  },
  {
    accessorKey: 'priceUSD',
    header: 'Price (USD)',
    cell: ({ row }) => `$${row.getValue('priceUSD')}`,
  },
  {
    accessorKey: 'finishingTime',
    header: 'Duration',
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
    cell: ({ row }) => {
      const service = row.original;
      const { user } = useAuth();
      const { toast } = useToast();
      const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

      const handleDelete = async () => {
        if (!user) {
          toast({ variant: 'destructive', title: 'Not authenticated' });
          return;
        }
        try {
          await deleteDoc(doc(db, `users/${user.uid}/services`, service.id));
          toast({ title: 'Service deleted successfully' });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error deleting service' });
        }
      };

      return (
        <AlertDialog>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>Edit</DropdownMenuItem>
                </DialogTrigger>
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Service</DialogTitle>
                <DialogDescription>
                  Update the details of your service below.
                </DialogDescription>
              </DialogHeader>
              <ServiceForm
                service={service}
                categories={categories}
                closeForm={() => setIsEditDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this service.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    },
  },
];
