
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
import { ServiceForm } from './service-form';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { EditableCell } from '../ui/editable-cell';

interface ColumnsProps {
    categories: Category[];
    setServices: React.Dispatch<React.SetStateAction<Service[]>>;
}

export const getColumns = ({ categories, setServices }: ColumnsProps): ColumnDef<Service>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <EditableCell
        initialValue={row.original.name}
        onSave={(value) => {
            const serviceId = row.original.id;
            setServices(prev => prev.map(s => s.id === serviceId ? { ...s, name: value } : s));
            return { collection: 'services', docId: serviceId, field: 'name', value };
        }}
    />,
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
    cell: ({ row }) => <EditableCell
        initialValue={row.original.priceLKR}
        onSave={(value) => {
            const serviceId = row.original.id;
            const numericValue = Number(value);
            setServices(prev => prev.map(s => s.id === serviceId ? { ...s, priceLKR: numericValue } : s));
            return { collection: 'services', docId: serviceId, field: 'priceLKR', value: numericValue };
        }}
        type="number"
    />,
  },
  {
    accessorKey: 'priceUSD',
    header: 'Price (USD)',
    cell: ({ row }) => <EditableCell
        initialValue={row.original.priceUSD}
        onSave={(value) => {
            const serviceId = row.original.id;
            const numericValue = Number(value);
            setServices(prev => prev.map(s => s.id === serviceId ? { ...s, priceUSD: numericValue } : s));
            return { collection: 'services', docId: serviceId, field: 'priceUSD', value: numericValue };
        }}
        type="number"
    />,
  },
  {
    accessorKey: 'finishingTime',
    header: 'Duration',
    cell: ({ row }) => <EditableCell
        initialValue={row.original.finishingTime}
        onSave={(value) => {
            const serviceId = row.original.id;
            setServices(prev => prev.map(s => s.id === serviceId ? { ...s, finishingTime: value } : s));
            return { collection: 'services', docId: serviceId, field: 'finishingTime', value };
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
      const service = row.original;
      const { user } = useAuth();
      const { toast } = useToast();
      const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setIsDeleteDialogOpen(true)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
        </>
      );
    },
  },
];
