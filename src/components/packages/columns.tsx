
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Package, Service } from '@/lib/types';
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
import { PackageForm } from './package-form';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Badge } from '../ui/badge';

export const getColumns = ({ services }: { services: Service[] }): ColumnDef<Package>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
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
    accessorKey: 'serviceIds',
    header: 'Services',
    cell: ({ row }) => {
      const serviceIds = row.getValue('serviceIds') as string[];
      return <Badge>{serviceIds.length} included</Badge>;
    },
  },
  {
    accessorKey: 'duration',
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
    cell: function Actions({ row }) {
      const pkg = row.original;
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
          await deleteDoc(doc(db, `users/${user.uid}/packages`, pkg.id));
          toast({ title: 'Package deleted successfully' });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error deleting package' });
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Package</DialogTitle>
                <DialogDescription>
                  Update the details of your package below.
                </DialogDescription>
              </DialogHeader>
              <PackageForm
                pkg={pkg}
                services={services}
                closeForm={() => setIsEditDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this package.
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
