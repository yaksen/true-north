
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Service } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ActionsCell: React.FC<{ service: Service }> = ({ service }) => {
    const { toast } = useToast();

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this service?")) return;
        try {
            await deleteDoc(doc(db, 'services', service.id));
            toast({ title: 'Success', description: 'Service deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete service.' });
        }
    };
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => alert('Editing coming soon!')}>Edit Service</DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">Delete Service</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const servicesColumns: ColumnDef<Service>[] = [
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
      accessorKey: "priceLKR",
      header: () => <div className="text-right">Price (LKR)</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("priceLKR"));
        const formatted = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(amount);
        return <div className="text-right">{formatted}</div>;
      },
    },
    {
      accessorKey: "priceUSD",
      header: () => <div className="text-right">Price (USD)</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("priceUSD"));
        const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
        return <div className="text-right">{formatted}</div>;
      },
    },
    {
      accessorKey: "finishTime",
      header: "Finish Time",
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell service={row.original} />,
    },
  ];

