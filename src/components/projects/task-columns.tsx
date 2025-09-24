
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Task, Lead } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Star } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { logActivity } from "@/lib/activity-log";
import { useState } from "react";
import { TaskForm } from "./task-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { Checkbox } from "../ui/checkbox";
import { cn } from "@/lib/utils";

interface ActionsCellProps {
  task: Task;
  leads: Lead[];
}

const ActionsCell: React.FC<ActionsCellProps> = ({ task, leads }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleDelete = async () => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'tasks', task.id));
            await logActivity(task.projectId, 'task_deleted', { name: task.title }, user.uid);
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
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}><Edit className="mr-2 h-4 w-4"/> Edit Task</DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Task</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the task. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
                    <TaskForm task={task} projectId={task.projectId} leads={leads} closeForm={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    );
};


export const getTaskColumns = (options: { leads: Lead[], onStar: (id: string, starred: boolean) => void }): ColumnDef<Task>[] => [
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => options.onStar(task.id, !task.starred)}>
                    <Star className={cn("h-4 w-4", task.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                </Button>
            )
        },
        enableSorting: false,
        enableHiding: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Title <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue("title")}</div>,
    },
    {
        accessorKey: "dueDate",
        header: "Due Date",
        cell: ({ row }) => row.original.dueDate ? new Date(row.original.dueDate).toLocaleDateString() : 'N/A'
    },
    {
        accessorKey: "assigneeUid",
        header: "Assignee",
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell task={row.original} leads={options.leads} />,
    },
  ];
