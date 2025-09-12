
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Category } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { logActivity } from "@/lib/activity-log";
import { useState } from "react";
import { CategoryForm } from "./category-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";

interface ActionsCellProps {
  category: Category;
}

const ActionsCell: React.FC<ActionsCellProps> = ({ category }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleDelete = async () => {
        if (!user) return;
        
        // Check for dependencies
        const servicesQuery = query(collection(db, 'services'), where('categoryId', '==', category.id));
        const servicesSnapshot = await getDocs(servicesQuery);
        if (!servicesSnapshot.empty) {
            toast({
                variant: 'destructive',
                title: 'Cannot delete category',
                description: `This category is used by ${servicesSnapshot.size} service(s). Please re-assign them first.`,
            });
            return;
        }

        try {
            await deleteDoc(doc(db, 'categories', category.id));
            await logActivity(category.projectId, 'category_deleted', { name: category.name }, user.uid);
            toast({ title: 'Success', description: 'Category deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete category.' });
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
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}><Edit className="mr-2 h-4 w-4"/> Edit Category</DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Category</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the category. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
                    <CategoryForm category={category} projectId={category.projectId} closeForm={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    );
};

interface ColumnDependencies {
    onEdit: (category: Category) => void;
    onDelete: (categoryId: string) => void;
}

export const getCategoriesColumns = (deps: ColumnDependencies): ColumnDef<Category>[] => [
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
        accessorKey: "notes",
        header: "Notes",
        cell: ({ row }) => <div className="truncate max-w-xs">{row.getValue("notes")}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell category={row.original} />,
    },
  ];
