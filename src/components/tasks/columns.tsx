
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Task, TaskPriority, TaskStatus, Subtask } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ArrowUp, ArrowRight, ArrowDown, ShieldAlert, Sparkles, ChevronsRight, CheckCircle2 } from 'lucide-react';
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
import { TaskForm } from './task-form';
import { useAuth } from '@/hooks/use-auth';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Checkbox } from '../ui/checkbox';
import { EditableCell } from '../ui/editable-cell';

const priorityIcons = {
    low: <ArrowDown className="h-4 w-4 text-muted-foreground" />,
    medium: <ArrowRight className="h-4 w-4 text-muted-foreground" />,
    high: <ArrowUp className="h-4 w-4 text-muted-foreground" />,
}

interface ColumnProps {
    tasks: Task[];
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export const getColumns = ({ tasks, setTasks }: ColumnProps): ColumnDef<Task>[] => [
  {
    accessorKey: 'status',
    header: 'Status',
    cell: function StatusCell({ row }) {
        const task = row.original;
        const { user } = useAuth();
        const { toast } = useToast();

        const handleStatusChange = async (newStatus: TaskStatus) => {
            if (!user) return;
            const taskRef = doc(db, `users/${user.uid}/tasks`, task.id);
            try {
                await updateDoc(taskRef, { status: newStatus });
                // Optimistic update
                setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error updating status' });
            }
        };
        
        return (
            <div className="flex items-center space-x-2">
                 <Checkbox
                    id={`status-${task.id}`}
                    checked={task.status === 'done'}
                    onCheckedChange={(checked) => {
                        handleStatusChange(checked ? 'done' : 'pending');
                    }}
                />
                <Badge variant={task.status === 'done' ? 'default': 'outline'} className="capitalize">
                    {task.status}
                </Badge>
            </div>
        );
    },
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: function TitleCell({ row }) {
        const task = row.original;
        const { user } = useAuth();
        const { toast } = useToast();

        const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
            if (!user) return;
            const updatedSubtasks = task.subtasks?.map(st => 
                st.id === subtaskId ? { ...st, completed } : st
            );
            const taskRef = doc(db, `users/${user.uid}/tasks`, task.id);
            try {
                await updateDoc(taskRef, { subtasks: updatedSubtasks });
                setTasks(prev => prev.map(t => t.id === task.id ? {...t, subtasks: updatedSubtasks} : t));
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error updating subtask' });
            }
        };

        return (
            <div>
                <EditableCell
                    initialValue={task.title}
                    onSave={(value) => {
                        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, title: value } : t));
                        return { collection: 'tasks', docId: task.id, field: 'title', value };
                    }}
                    className="font-medium"
                />
                {task.subtasks && task.subtasks.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {task.subtasks.map(subtask => (
                            <div key={subtask.id} className="flex items-center gap-2">
                                <Checkbox
                                    id={subtask.id}
                                    checked={subtask.completed}
                                    onCheckedChange={(checked) => handleSubtaskToggle(subtask.id, !!checked)}
                                />
                                <EditableCell
                                    initialValue={subtask.title}
                                    onSave={(value) => {
                                        const updatedSubtasks = task.subtasks?.map(st => st.id === subtask.id ? {...st, title: value} : st)
                                        setTasks(prev => prev.map(t => t.id === task.id ? {...t, subtasks: updatedSubtasks} : t));
                                        return { collection: 'tasks', docId: task.id, field: 'subtasks', value: updatedSubtasks };
                                    }}
                                    className={`text-sm ${subtask.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
  },
  {
    accessorKey: 'ai-insights',
    header: 'AI Insights',
    cell: ({ row }) => {
        const task = row.original;
        const hasInsights = task.obstacles?.length || task.tips?.length;

        if (!hasInsights) return <span className="text-muted-foreground/50">None</span>;

        return (
            <div className="space-y-2">
                {task.obstacles && task.obstacles.length > 0 && (
                    <div className="flex items-start gap-2">
                        <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground italic">
                           {task.obstacles.join(', ')}
                        </p>
                    </div>
                )}
                {task.tips && task.tips.length > 0 && (
                     <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                            {task.tips.join(', ')}
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
      const priority = row.getValue('priority') as TaskPriority;
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
      const task = row.original;
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
            await deleteDoc(doc(db, `users/${user.uid}/tasks`, task.id));
            toast({ title: "Task deleted successfully" });
        } catch (error) {
            toast({ variant: "destructive", title: "Error deleting task" });
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
                    <DialogTitle>Edit Task</DialogTitle>
                    <DialogDescription>
                        Update the details of your task below.
                    </DialogDescription>
                    </DialogHeader>
                    <TaskForm task={task} closeForm={() => setIsEditDialogOpen(false)} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this task.
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
