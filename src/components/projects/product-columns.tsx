
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Product, Category } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Star } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { logActivity } from "@/lib/activity-log";
import { useState } from "react";
import { ProductForm } from "./product-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { formatCurrency, cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";

interface ColumnDependencies {
    categories: Category[];
    onStar: (id: string, starred: boolean) => void;
}

const ActionsCell: React.FC<{ product: Product, dependencies: Omit<ColumnDependencies, 'onStar'> }> = ({ product, dependencies }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const { categories } = dependencies;

    const handleDelete = async () => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'products', product.id));
            await logActivity(product.projectId, 'product_deleted' as any, { name: product.name }, user.uid);
            toast({ title: 'Success', description: 'Product deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete product.' });
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
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}><Edit className="mr-2 h-4 w-4"/> Edit Product</DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Product</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the product. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
                    <ProductForm product={product} categories={categories} closeForm={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    );
};

export const getProductsColumns = (dependencies: ColumnDependencies): ColumnDef<Product>[] => [
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
            const product = row.original;
            return (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => dependencies.onStar(product.id, !product.starred)}>
                    <Star className={cn("h-4 w-4", product.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                </Button>
            )
        },
        enableSorting: false,
        enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "sku",
        header: "SKU",
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
        accessorKey: "quantity",
        header: "Quantity",
        cell: ({ row }) => <div className="text-center">{row.getValue("quantity")}</div>,
    },
    {
      accessorKey: "price",
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => {
        const product = row.original;
        const formatted = formatCurrency(product.price, product.currency);
        return <div className="text-right">{formatted}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell product={row.original} dependencies={dependencies} />,
    },
  ];
