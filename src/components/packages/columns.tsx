
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Package, Service, PackageCategory } from '@/lib/types';
import { MoreHorizontal, Tag } from 'lucide-react';
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
import { EditableCell } from '../ui/editable-cell';
import { calculateDiscountedTotal } from '@/lib/billing';

interface ColumnsProps {
    services: Service[];
    setPackages: React.Dispatch<React.SetStateAction<Package[]>>;
}

export const getColumns = ({ services, setPackages }: ColumnsProps): ColumnDef<Package>[] => [
  {
    accessorKey: 'packageId',
    header: 'Package ID',
    cell: ({ row }) => <div className="font-mono text-muted-foreground">#{row.original.packageId}</div>,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <EditableCell
        initialValue={row.original.name}
        onSave={(value) => {
            const packageId = row.original.id;
            setPackages(prev => prev.map(p => p.id === packageId ? { ...p, name: value } : p));
            return { collection: 'packages', docId: packageId, field: 'name', value };
        }}
    />,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const category = row.getValue('category') as PackageCategory;
      return <Badge variant={category === 'fixed' ? 'default' : 'secondary'} className="capitalize">{category}</Badge>;
    },
  },
  {
    accessorKey: 'priceLKR',
    header: 'Price (LKR)',
    cell: ({ row }) => {
        const pkg = row.original;
        const { discountedPriceLKR, totalDiscountLKR } = calculateDiscountedTotal(pkg);
        const hasDiscount = totalDiscountLKR > 0;

        return (
            <div className='flex flex-col'>
                {hasDiscount && (
                    <span className="line-through text-muted-foreground text-xs">
                        {pkg.priceLKR.toLocaleString()}
                    </span>
                )}
                 <span className="font-medium">{discountedPriceLKR.toLocaleString()}</span>
                 {hasDiscount && (
                    <Badge variant="secondary" className="w-fit mt-1">
                        <Tag className="mr-1 h-3 w-3" /> -{totalDiscountLKR.toLocaleString()}
                    </Badge>
                 )}
            </div>
        )
    }
  },
  {
    accessorKey: 'priceUSD',
    header: 'Price (USD)',
    cell: ({ row }) => {
       const pkg = row.original;
        const { discountedPriceUSD, totalDiscountUSD } = calculateDiscountedTotal(pkg);
        const hasDiscount = totalDiscountUSD > 0;

        return (
            <div className='flex flex-col'>
                {hasDiscount && (
                    <span className="line-through text-muted-foreground text-xs">
                        ${pkg.priceUSD.toLocaleString()}
                    </span>
                )}
                 <span className="font-medium">${discountedPriceUSD.toLocaleString()}</span>
            </div>
        )
    }
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
    cell: ({ row }) => <EditableCell
        initialValue={row.original.duration}
        onSave={(value) => {
            const packageId = row.original.id;
            setPackages(prev => prev.map(p => p.id === packageId ? { ...p, duration: value } : p));
            return { collection: 'packages', docId: packageId, field: 'duration', value };
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
      const pkg = row.original;
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
          await deleteDoc(doc(db, `users/${user.uid}/packages`, pkg.id));
          toast({ title: 'Package deleted successfully' });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error deleting package' });
        } finally {
          setIsDeleteDialogOpen(false);
        }
      };

      const canDelete = userRole === 'admin' || userRole === 'manager';

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
              {canDelete && (
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
                packageCategory={pkg.category}
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
