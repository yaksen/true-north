
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Lead, LeadState } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
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
import { LeadForm } from './lead-form';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { EditableCell } from '../ui/editable-cell';

const leadStates: LeadState[] = ['new', 'contacted', 'interested', 'lost', 'converted'];

interface ColumnsProps {
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}

export const getColumns = ({ setLeads }: ColumnsProps): ColumnDef<Lead>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <EditableCell
        initialValue={row.original.name}
        onSave={(value) => {
            const leadId = row.original.id;
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, name: value } : l));
            return { collection: 'leads', docId: leadId, field: 'name', value };
        }}
    />,
  },
  {
    accessorKey: 'emails',
    header: 'Email',
    cell: ({ row }) => {
        const emails = row.getValue('emails') as string[];
        return <EditableCell
            initialValue={emails?.[0] || ''}
            onSave={(value) => {
                const leadId = row.original.id;
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, emails: [value] } : l));
                return { collection: 'leads', docId: leadId, field: 'emails', value: [value] };
            }}
        />
    }
  },
  {
    accessorKey: 'phoneNumbers',
    header: 'Phone',
    cell: ({ row }) => {
        const phones = row.getValue('phoneNumbers') as string[];
        return <EditableCell
            initialValue={phones?.[0] || ''}
            onSave={(value) => {
                const leadId = row.original.id;
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, phoneNumbers: [value] } : l));
                return { collection: 'leads', docId: leadId, field: 'phoneNumbers', value: [value] };
            }}
        />
    }
  },
  {
    accessorKey: 'state',
    header: 'State',
    cell: ({ row }) => {
      const state = row.getValue('state') as LeadState;
      return (
        <Badge variant="outline" className="capitalize">
            {state}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => {
        const date = row.getValue('createdAt') as Date;
        return <div>{date.toLocaleDateString()}</div>
    }
  },
  {
    id: 'actions',
    cell: function Actions({ row }) {
      const lead = row.original;
      const { user } = useAuth();
      const { toast } = useToast();
      const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
      
      const userRole = user?.profile?.role;

      const handleDelete = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Not authenticated" });
            return;
        }
        try {
            await deleteDoc(doc(db, `users/${user.uid}/leads`, lead.id));
            toast({ title: "Lead deleted successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error deleting lead" });
        } finally {
            setIsDeleteDialogOpen(false);
        }
      }

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
                            <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive">Delete</DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Edit Lead</DialogTitle>
                    <DialogDescription>
                        Update the details of your lead below.
                    </DialogDescription>
                    </DialogHeader>
                    <LeadForm lead={lead} closeForm={() => setIsEditDialogOpen(false)} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this lead.
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
