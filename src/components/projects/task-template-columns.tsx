
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { TaskTemplate, Project } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Copy, Star } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { TaskTemplateForm } from "./task-template-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
import { cn } from "@/lib/utils";

interface ActionsCellProps {
  template: TaskTemplate;
  project: Project;
}

const ActionsCell: React.FC<ActionsCellProps> = ({ template, project }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleDelete = async () => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'taskTemplates', template.id));
            toast({ title: 'Success', description: 'Template deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete template.' });
        }
    };
    
    const handleDuplicate = async () => {
        if (!user) return;
        try {
            const { id, createdAt, updatedAt, ...templateData } = template;
            await addDoc(collection(db, 'taskTemplates'), {
                ...templateData,
                title: `${template.title} (Copy)`,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Template duplicated.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not duplicate template.' });
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
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}><Edit className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate}><Copy className="mr-2 h-4 w-4"/> Duplicate</DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader><TaskTemplateForm template={template} projectId={project.id} members={project.members} closeForm={() => setIsEditOpen(false)} /></DialogContent></Dialog>
        </>
    );
};

const DaysOfWeekCell: React.FC<{ days: number[] }> = ({ days }) => {
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const activeDays = new Set(days);
    return (
        <div className="flex gap-1">
            {dayNames.map((day, index) => (
                <span key={index} className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${activeDays.has(index) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {day}
                </span>
            ))}
        </div>
    );
};

export const getTaskTemplatesColumns = (project: Project, onStar: (id: string, starred: boolean) => void): ColumnDef<TaskTemplate>[] => [
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
            const template = row.original;
            return (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStar(template.id, !template.starred)}>
                    <Star className={cn("h-4 w-4", template.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
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
       cell: ({ row }) => <div className="font-medium p-2">{row.original.title}</div>,
    },
    {
      accessorKey: "slot",
      header: "Slot",
      cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.slot}</Badge>,
    },
    {
      accessorKey: "daysOfWeek",
      header: "Schedule",
      cell: ({ row }) => <DaysOfWeekCell days={row.original.daysOfWeek} />,
    },
    {
        id: "actions",
        cell: ({ row }) => <ActionsCell template={row.original} project={project} />,
    },
];
