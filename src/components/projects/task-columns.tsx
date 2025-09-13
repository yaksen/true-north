
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Task, Lead } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, PlusCircle, ChevronRight, Star } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { TaskForm } from "./task-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { Checkbox } from "../ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { logActivity } from "@/lib/activity-log";
import { cn } from "@/lib/utils";

interface ColumnDependencies {
    leads: Lead[];
}

const ActionsCell: React.FC<{ task: Task, leads: Lead[] }> = ({ task, leads }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleDelete = async () => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'tasks', task.id));
            await logActivity(task.projectId, 'task_deleted', { title: task.title }, user.uid);
            toast({ title: 'Success', description: 'Task deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete task.' });
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
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4"/> Edit Task
                    </DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4"/> Delete Task
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the task.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    <TaskForm task={task} projectId={task.projectId} leads={leads} closeForm={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    );
};


export const getTaskColumns = (dependencies: ColumnDependencies, onStar: (id: string, starred: boolean) => void): ColumnDef<Task>[] => [
    {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
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
        id: 'star',
        cell: ({ row }) => {
            const task = row.original;
            return (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStar(task.id, !task.starred)}>
                    <Star className={cn("h-4 w-4", task.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                </Button>
            )
        },
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "completed",
        header: "Done",
        cell: ({ row }) => {
            const task = row.original;
            const { toast } = useToast();
            const handleCheckedChange = async (checked: boolean) => {
                try {
                    const taskRef = doc(db, 'tasks', task.id);
                    await updateDoc(taskRef, { completed: checked });
                    // No toast for this to avoid being noisy
                } catch (error) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not update task.' });
                }
            };
            return (
                <Checkbox
                    checked={task.completed}
                    onCheckedChange={handleCheckedChange}
                    aria-label="Mark task as done"
                />
            )
        }
    },
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
       cell: ({ row }) => {
        const task = row.original;
        const canExpand = row.getCanExpand();
        return (
            <div className="flex items-center pl-2 font-medium" style={{ paddingLeft: `${row.depth * 2}rem` }}>
                {canExpand && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={row.getToggleExpandedHandler()}>
                        <ChevronRight className={`h-4 w-4 transition-transform ${row.getIsExpanded() ? 'rotate-90' : ''}`} />
                    </Button>
                )}
                <span className={task.completed ? "line-through text-muted-foreground" : ""}>
                    {task.title}
                </span>
            </div>
        )
       },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        let variant: "default" | "secondary" | "destructive" = "secondary";
        if (status === 'Project') variant = 'default';
        return <Badge variant={variant}>{status}</Badge>
      }
    },
    {
        accessorKey: "leadId",
        header: "Lead",
        cell: ({ row }) => {
            const leadId = row.getValue("leadId") as string;
            const lead = dependencies.leads.find(l => l.id === leadId);
            return lead ? <Badge variant="outline">{lead.name}</Badge> : null;
        }
    },
    {
        accessorKey: "dueDate",
        header: "Due Date",
        cell: ({ row }) => {
          const date = row.getValue("dueDate") as Date | undefined;
          return date ? new Date(date).toLocaleDateString() : 'N/A';
        }
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell task={row.original} leads={dependencies.leads} />,
    },
  ];
