
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { UserProfile, UserRole } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, User } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { EditableCell } from '../ui/editable-cell';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


interface ColumnsProps {
    setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
    currentUser: User | null;
}

export const getColumns = ({ setUsers, currentUser }: ColumnsProps): ColumnDef<UserProfile>[] => [
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <EditableCell
        initialValue={row.original.email}
        onSave={async (value) => {
            const userId = row.original.id;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, email: value } : u));
            return { collection: 'users', docId: userId, field: 'email', value };
        }}
        canEdit={currentUser?.profile?.role === 'admin' || currentUser?.profile?.role === 'manager'}
    />,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <EditableCell
        initialValue={row.original.name ?? ''}
        onSave={async (value) => {
            const userId = row.original.id;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, name: value } : u));
            return { collection: 'users', docId: userId, field: 'name', value };
        }}
        canEdit={currentUser?.profile?.role === 'admin' || currentUser?.profile?.role === 'manager'}
    />,
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.getValue('role') as UserRole;
      const isSuperUser = role === 'admin';
      const variant = isSuperUser ? 'default' : 'secondary';
      const icon = isSuperUser ? <ShieldCheck className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />;
      return (
        <Badge variant={variant} className="capitalize">
            {icon}
            {isSuperUser ? 'Super User' : 'Manager'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'lastLogin',
    header: 'Last Login',
    cell: ({ row }) => {
      const date = row.original.lastLogin as Date | undefined;
      return <div>{date ? date.toLocaleString() : 'Never'}</div>;
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
      const { user } = useAuth(); // We still use this to get the logged in user
      const { toast } = useToast();
      const [currentRole, setCurrentRole] = useState(userProfile.role);

      const handleRoleChange = async (newRole: UserRole) => {
        if (user?.profile?.role !== 'admin') {
            toast({ variant: "destructive", title: "Permission Denied", description: "Only Super Users can change roles." });
            return;
        }
        if (user.uid === userProfile.id) {
            toast({ variant: "destructive", title: "Invalid Action", description: "You cannot change your own role." });
            return;
        }
        
        try {
            const userDocRef = doc(db, 'users', userProfile.id);
            await updateDoc(userDocRef, { role: newRole, updatedAt: new Date() });
            toast({ title: "Success", description: `User ${userProfile.name || userProfile.email} has been updated to ${newRole === 'admin' ? 'Super User' : 'Manager'}.` });
            setCurrentRole(newRole);
            setUsers(prev => prev.map(u => u.id === userProfile.id ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error("Error updating role: ", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update user role." });
        }
      };

      const isSuperUser = currentUser?.profile?.role === 'admin';

      return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" 
                    disabled={user?.uid === userProfile.id || !isSuperUser}
                >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                 {isSuperUser && (
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Promote/Demote</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuRadioGroup value={currentRole} onValueChange={(value) => handleRoleChange(value as UserRole)}>
                                <DropdownMenuRadioItem value="admin">Super User</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="manager">Manager</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-destructive">
                    Delete User (Not Implemented)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
