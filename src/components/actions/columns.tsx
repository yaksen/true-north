
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Action, ActionPriority, ActionStatus, Subtask } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ArrowUp, ArrowRight, ArrowDown, ShieldAlert, Sparkles, PlusCircle } from 'lucide-react';
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
import { ActionForm } from './action-form';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Checkbox } from '../ui/checkbox';
import { EditableCell } from '../ui/editable-cell';
import { v4 as uuidv4 } from 'uuid';

const priorityIcons = {
    low: <ArrowDown className="h-4 w-4 text-muted-foreground" />,
    medium: <ArrowRight className="h-4 w-4 text-muted-foreground" />,
    high: <ArrowUp className="h-4 w-4 text-muted-foreground" />,
}

interface ColumnProps {
    actions: Action[];
    setActions: React.Dispatch<React.SetStateAction<Action[]>>;
}

export const getColumns = ({ actions, setActions }: ColumnProps): ColumnDef<Action>[] => [
  {
    accessorKey: 'title',
    header: 'Action',
    cell: function TitleCell({ row }) {
        const action = row.original;
        const { user } = useAuth();
        const { toast } = useToast();

        const handleStatusChange = async (newStatus: ActionStatus) => {
            if (!user) return;
            const actionRef = doc(db, `users/${user.uid}/actions`, action.id);
            try {
                await updateDoc(actionRef, { status: newStatus });
                setActions(prevActions => prevActions.map(a => a.id === action.id ? { ...a, status: newStatus } : a));
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error updating status' });
            }
        };

        const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
            if (!user) return;
            const updatedSubtasks = action.subtasks?.map(st => 
                st.id === subtaskId ? { ...st, completed } : st
            );
            const actionRef = doc(db, `users/${user.uid}/actions`, action.id);
            try {
                await updateDoc(actionRef, { subtasks: updatedSubtasks });
                setActions(prev => prev.map(a => a.id === action.id ? {...a, subtasks: updatedSubtasks} : a));
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error updating subtask' });
            }
        };

        const handleAddSubtask = async () => {
            if(!user) return;
            const newSubtask = { id: uuidv4(), title: 'New subtask', completed: false };
            const updatedSubtasks = [...(action.subtasks || []), newSubtask];
            const actionRef = doc(db, `users/${user.uid}/actions`, action.id);
             try {
                await updateDoc(actionRef, { subtasks: updatedSubtasks });
                setActions(prev => prev.map(a => a.id === action.id ? {...a, subtasks: updatedSubtasks} : a));
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error adding subtask' });
            }
        }

        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                     <Checkbox
                        id={`status-${action.id}`}
                        checked={action.status === 'completed'}
                        onCheckedChange={(checked) => {
                            handleStatusChange(checked ? 'completed' : 'pending');
                        }}
                    />
                    <EditableCell
                        initialValue={action.title}
                        onSave={(value) => {
                            setActions(prev => prev.map(a => a.id === action.id ? { ...a, title: value } : a));
                            return { collection: 'actions', docId: action.id, field: 'title', value };
                        }}
                        className={`font-medium ${action.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                    />
                </div>
                {action.subtasks && action.subtasks.length > 0 && (
                    <div className="ml-6 space-y-2">
                        {action.subtasks.map(subtask => (
                            <div key={subtask.id} className="flex items-center gap-2">
                                <Checkbox
                                    id={subtask.id}
                                    checked={subtask.completed}
                                    onCheckedChange={(checked) => handleSubtaskToggle(subtask.id, !!checked)}
                                />
                                <EditableCell
                                    initialValue={subtask.title}
                                    onSave={(value) => {
                                        const updatedSubtasks = action.subtasks?.map(st => st.id === subtask.id ? {...st, title: value} : st)
                                        setActions(prev => prev.map(a => a.id === action.id ? {...a, subtasks: updatedSubtasks} : a));
                                        return { collection: 'actions', docId: action.id, field: 'subtasks', value: updatedSubtasks };
                                    }}
                                    className={`text-sm ${subtask.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                                />
                            </div>
                        ))}
                    </div>
                )}
                 <Button variant="ghost" size="sm" className="ml-6 h-auto p-0" onClick={handleAddSubtask}>
                    <PlusCircle className="mr-2 h-3.5 w-3.5" />
                    <span className="text-xs">Add Subtask</span>
                </Button>
            </div>
        );
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: function StatusCell({ row }) {
        const status = row.getValue('status') as ActionStatus;
        return <Badge variant={status === 'completed' ? 'default': 'outline'} className="capitalize">{status}</Badge>
    }
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: function TypeCell({ row }) {
        const type = row.getValue('type') as ActionStatus;
        return <Badge variant="secondary" className="capitalize">{type}</Badge>
    }
  },
  {
    accessorKey: 'ai-insights',
    header: 'AI Insights',
    cell: ({ row }) => {
        const action = row.original;
        const hasInsights = action.obstacles?.length || action.tips?.length;

        if (!hasInsights) return <span className="text-muted-foreground/50">None</span>;

        return (
            <div className="space-y-2">
                {action.obstacles && action.obstacles.length > 0 && (
                    <div className="flex items-start gap-2">
                        <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground italic">
                           {action.obstacles.join(', ')}
                        </p>
                    </div>
                )}
                {action.tips && action.tips.length > 0 && (
                     <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                            {action.tips.join(', ')}
                        </p>
                    </div>
                )}
            </div>
        )
    }
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      const priority = row.getValue('priority') as ActionPriority;
      return (
        <div className="flex items-center gap-2 capitalize">
            {priorityIcons[priority]}
            <span>{priority}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => {
        const date = row.getValue('dueDate') as Date | undefined;
        return <div>{date ? date.toLocaleDateString() : 'N/A'}</div>
    }
  },
  {
    id: 'actions',
    cell: function Actions({ row }) {
      const action = row.original;
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
                    <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>Edit</DropdownMenuItem>
                    {canDelete && (
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
                    <DialogTitle>Edit Action</DialogTitle>
                    <DialogDescription>
                        Update the details of your action below.
                    </DialogDescription>
                    </DialogHeader>
                    <ActionForm action={action} closeForm={() => setIsEditDialogOpen(false)} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this action.
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
