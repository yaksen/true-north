
'use client';

import { ColumnDef } from "@tanstack/react-table";
import type { Invoice, InvoiceStatus, Project, Lead } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { logActivity } from "@/lib/activity-log";
import Link from "next/link";
import { useCurrency } from "@/context/CurrencyContext";

interface DataDependencies {
    projects: Project[];
    leads: Lead[];
}

const ActionsCell: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
    const { toast } = useToast();
    const { user } = useAuth();

    const handleDelete = async () => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'invoices', invoice.id));
            await logActivity(invoice.projectId, 'invoice_deleted' as any, { invoiceNumber: invoice.invoiceNumber }, user.uid);
            toast({ title: 'Success', description: 'Invoice deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete invoice.' });
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
                    <DropdownMenuItem asChild>
                        <Link href={`/dashboard/billing/${invoice.id}`}>
                            <Eye className="mr-2 h-4 w-4"/> View Invoice
                        </Link>
                    </DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4"/> Delete Invoice
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the invoice.
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
        </>
    );
};

export const getInvoiceColumns = (dependencies: DataDependencies): ColumnDef<Invoice>[] => [
    {
      accessorKey: "invoiceNumber",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Invoice # <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="pl-4 font-medium">{row.getValue("invoiceNumber")}</div>,
    },
    {
      accessorKey: "leadId",
      header: "Client",
      cell: ({ row }) => {
        const leadId = row.getValue("leadId") as string;
        const lead = dependencies.leads.find(l => l.id === leadId);
        return <div>{lead?.name || 'Unknown Client'}</div>
      }
    },
    {
        accessorKey: "projectId",
        header: "Project",
        cell: ({ row }) => {
          const projectId = row.getValue("projectId") as string;
          const project = dependencies.projects.find(p => p.id === projectId);
          return <div>{project?.name || 'Unknown Project'}</div>
        }
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as InvoiceStatus;
          const variant: "default" | "secondary" | "destructive" = 
            status === 'paid' ? 'default' : status === 'sent' ? 'secondary' : 'destructive';
          return <Badge variant={variant} className="capitalize">{status}</Badge>
        }
    },
    {
        accessorKey: "dueDate",
        header: "Due Date",
        cell: ({ row }) => new Date(row.getValue("dueDate")).toLocaleDateString(),
    },
    {
        id: 'total',
        header: () => <div className="text-right">Amount</div>,
        cell: function Cell({ row }) {
            const invoice = row.original;
            const project = dependencies.projects.find(p => p.id === invoice.projectId);
            const { globalCurrency } = useCurrency();
            
            // Mock conversion
            const MOCK_RATES: { [key: string]: number } = { USD: 1, LKR: 300, EUR: 0.9, GBP: 0.8 };
            const convert = (amount: number, from: string, to: string) => {
                const fromRate = MOCK_RATES[from] || 1;
                const toRate = MOCK_RATES[to] || 1;
                return (amount / fromRate) * toRate;
            };

            const displayCurrency = globalCurrency || project?.currency || 'USD';

            const subtotal = invoice.lineItems.reduce((acc, item) => {
                return acc + convert(item.price * item.quantity, item.currency, displayCurrency);
            }, 0);

            let totalDiscount = 0;
            invoice.discounts.forEach(d => {
                if (d.type === 'percentage') {
                    totalDiscount += (subtotal - totalDiscount) * (d.value / 100);
                } else {
                    totalDiscount += convert(d.value, project?.currency || 'USD', displayCurrency);
                }
            });

            const total = (subtotal - totalDiscount) * (1 + invoice.taxRate / 100);
            
            const formatted = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: displayCurrency,
            }).format(total);

            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell invoice={row.original} />,
    },
];
