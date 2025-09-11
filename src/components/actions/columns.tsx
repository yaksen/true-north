
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Action, ActivityCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Checkbox } from '../ui/checkbox';

const priorityIcons: Record<string, React.ReactNode> = {
    low: <ArrowDown className="h-4 w-4 text-muted-foreground" />,
    medium: <ArrowRight className="h-4 w-4 text-muted-foreground" />,
    high: <ArrowUp className="h-4 w-4 text-muted-foreground" />,
    critical: <ArrowUp className="h-4 w-4 text-destructive" />,
}

interface ColumnProps {
    setActions: React.Dispatch<React.SetStateAction<Action[]>>;
}

export const getColumns = ({ setActions }: ColumnProps): ColumnDef<Action>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: function CategoryCell({ row }) {
        const category = row.getValue('category') as ActivityCategory;
        return <Badge variant="secondary" className="capitalize">{category}</Badge>
    }
  },
  {
    accessorKey: 'details.description',
    header: 'Details',
    cell: ({ row }) => {
        const action = row.original;
        let description = '';
        if (action.category === 'Sales') {
            description = `${action.details.productOrService} for ${action.details.amount}`;
        } else if (action.category === 'Tasks') {
            description = action.details.description;
        } else if (action.category === 'Expenses') {
            description = `${action.details.expenseType}: ${action.details.amount}`;
        }
        return <p className="font-medium">{description}</p>;
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: function StatusCell({ row }) {
        const status = row.getValue('status') as string;
        return <Badge variant={status === 'done' || status === 'won' ? 'default': 'outline'} className="capitalize">{status}</Badge>
    }
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const priority = row.getValue('priority') as string;
      if (!priority) return null;
      return (
        <div className="flex items-center gap-2 capitalize">
            {priorityIcons[priority.toLowerCase()]}
            <span>{priority}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => {
        const date = row.original.date as Date | undefined;
        return <div>{date ? date.toLocaleDateString() : 'N/A'}</div>
    }
  },
  {
    accessorKey: 'deadline',
    header: 'Deadline',
    cell: ({ row }) => {
        const date = row.original.deadline as Date | undefined;
        return <div>{date ? date.toLocaleDateString() : 'N/A'}</div>
    }
  },
  {
    id: 'actions',
    cell: function Actions({ row }) {
      const action = row.original;
      const { user } = useAuth();
      const { toast } = useToast();
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
      
      const userRole = user?.profile?.role;

      const handleDelete = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Not authenticated" });
            return;
        }
        try {
            await deleteDoc(doc(db, `users/${user.uid}/actions`, action.id));
            toast({ title: "Action deleted successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error deleting action" });
        } finally {
            setIsDeleteDialogOpen(false);
        }
      }

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
                    <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                    {canDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive">Delete</DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this item.
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
