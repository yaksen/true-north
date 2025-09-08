
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { UserProfile, UserRole } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ShieldCheck, UserCheck, Trash2 } from 'lucide-react';
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
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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


interface ColumnsProps {
    setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
    currentUser: User | null;
}

export const getColumns = ({ setUsers, currentUser }: ColumnsProps): ColumnDef<UserProfile>[] => [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
        const canEdit = currentUser?.profile?.role === 'admin' || currentUser?.profile?.role === 'manager';
        return <EditableCell
            initialValue={row.original.name ?? ''}
            onSave={(value) => {
                const userId = row.original.id;
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, name: value } : u));
                return { collection: 'users', docId: userId, field: 'name', value, useRootCollection: true };
            }}
            canEdit={canEdit}
        />
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
        const canEdit = currentUser?.profile?.role === 'admin' || currentUser?.profile?.role === 'manager';
         return <EditableCell
            initialValue={row.original.email}
            onSave={(value) => {
                const userId = row.original.id;
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, email: value } : u));
                return { collection: 'users', docId: userId, field: 'email', value, useRootCollection: true };
            }}
            canEdit={canEdit}
        />
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.getValue('role') as UserRole;
      const isAdmin = role === 'admin';
      const variant = isAdmin ? 'default' : 'secondary';
      const icon = isAdmin ? <ShieldCheck className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />;
      return (
        <Badge variant={variant} className="capitalize">
            {icon}
            {isAdmin ? 'Admin' : 'Manager'}
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
      const { user } = useAuth();
      const { toast } = useToast();
      const [currentRole, setCurrentRole] = useState(userProfile.role);
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

      const handleRoleChange = async (newRole: UserRole) => {
        if (user?.profile?.role !== 'admin') {
            toast({ variant: "destructive", title: "Permission Denied", description: "Only Admins can change roles." });
            return;
        }
        if (user.uid === userProfile.id) {
            toast({ variant: "destructive", title: "Invalid Action", description: "You cannot change your own role." });
            return;
        }
        
        try {
            const userDocRef = doc(db, 'users', userProfile.id);
            await updateDoc(userDocRef, { role: newRole, updatedAt: new Date() });
            toast({ title: "Success", description: `User ${userProfile.name || userProfile.email} has been updated to ${newRole === 'admin' ? 'Admin' : 'Manager'}.` });
            setCurrentRole(newRole);
            setUsers(prev => prev.map(u => u.id === userProfile.id ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error("Error updating role: ", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update user role." });
        }
      };

      const handleDelete = async () => {
         if (user?.profile?.role !== 'admin') {
            toast({ variant: "destructive", title: "Permission Denied", description: "Only Admins can delete users." });
            return;
        }
        if (user.uid === userProfile.id) {
            toast({ variant: "destructive", title: "Invalid Action", description: "You cannot delete your own account." });
            return;
        }
        try {
          await deleteDoc(doc(db, "users", userProfile.id));
          toast({ title: 'User deleted successfully' });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error deleting user' });
        } finally {
          setIsDeleteDialogOpen(false);
        }
      };
      
      const isAdmin = currentUser?.profile?.role === 'admin';
      const isSelf = currentUser?.uid === userProfile.id;

      return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" 
                        disabled={isSelf}
                    >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    {isAdmin && (
                        <>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Promote/Demote</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                <DropdownMenuRadioGroup value={currentRole} onValueChange={(value) => handleRoleChange(value as UserRole)}>
                                    <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="manager">Manager</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                        </DropdownMenuItem>
                        </>
                    )}
                    {!isAdmin && <DropdownMenuItem disabled>No actions available</DropdownMenuItem>}
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this user account.
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
