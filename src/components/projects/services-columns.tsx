
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Service, Category, Project } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { logActivity } from "@/lib/activity-log";
import { useState } from "react";
import { ServiceForm } from "./service-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "../ui/badge";

interface ColumnDependencies {
    categories: Category[];
    project: Project;
}

const ActionsCell: React.FC<{ service: Service, dependencies: ColumnDependencies }> = ({ service, dependencies }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { categories, project } = dependencies;

    const handleDelete = async () => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'services', service.id));
            await logActivity(service.projectId, 'service_deleted', { name: service.name }, user.uid);
            toast({ title: 'Success', description: 'Service deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete service.' });
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
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}><Edit className="mr-2 h-4 w-4"/> Edit Service</DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Service</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the service. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Service</DialogTitle></DialogHeader>
                    <ServiceForm service={service} project={project} categories={categories} closeForm={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    );
};

export const getServicesColumns = (dependencies: ColumnDependencies): ColumnDef<Service>[] => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium pl-4">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "categoryId",
        header: "Category",
        cell: ({ row }) => {
            const categoryId = row.getValue("categoryId") as string;
            const category = dependencies.categories.find(c => c.id === categoryId);
            return category ? category.name : 'Uncategorized';
        }
    },
    {
      accessorKey: "price",
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => {
        const service = row.original;
        const formatted = formatCurrency(service.price, service.currency);
        return <div className="text-right">{formatted}</div>;
      },
    },
    {
      accessorKey: "finishTime",
      header: "Finish Time",
      cell: ({ row }) => {
        const finishTime = row.getValue("finishTime") as string;
        const [value, unit] = finishTime.split(' ');
        if (!value || !unit) return finishTime;
        // Make unit singular if value is 1
        const formattedUnit = Number(value) === 1 ? unit.replace(/s$/, '') : unit;
        return <Badge variant="secondary">{`${value} ${formattedUnit}`}</Badge>;
      }
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell service={row.original} dependencies={dependencies} />,
    },
  ];

