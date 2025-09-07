
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { UserProfile, UserRole } from '@/lib/types';
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
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { EditableCell } from '../ui/editable-cell';


interface ColumnsProps {
    setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
}

export const getColumns = ({ setUsers }: ColumnsProps): ColumnDef<UserProfile>[] => [
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <EditableCell
        initialValue={row.original.name}
        onSave={(value) => {
            const userId = row.original.id;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, name: value } : u));
            return { collection: 'users', docId: userId, field: 'name', value };
        }}
    />,
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.getValue('role') as UserRole;
      return (
        <Badge variant="outline" className="capitalize">
            {role}
        </Badge>
      );
    },
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
      const userProfile = row.original;
      const { user } = useAuth();
      const { toast } = useToast();
      const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

      // In a real app, you would have forms and logic for these actions.
      // For now, we'll just disable them.

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" disabled={user?.uid === userProfile.id}>
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => alert("Editing not implemented yet.")}>Edit Role</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => alert("Deleting not implemented yet.")}
                className="text-destructive"
              >
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
    },
  },
];
