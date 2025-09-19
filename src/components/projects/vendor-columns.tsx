
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Vendor } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Star, Mail, Phone, Link as LinkIcon, Linkedin, Twitter, Github, Facebook, Instagram, CaseUpper } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { VendorForm } from "./vendor-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { logActivity } from "@/lib/activity-log";
import { Checkbox } from "../ui/checkbox";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import Link from "next/link";

interface ActionsCellProps {
  vendor: Vendor;
}

const ActionsCell: React.FC<ActionsCellProps> = ({ vendor }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleDelete = async () => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'vendors', vendor.id));
            await logActivity(vendor.projectId, 'vendor_deleted' as any, { name: vendor.name }, user.uid);
            toast({ title: 'Success', description: 'Vendor deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete vendor.' });
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
                        <Edit className="mr-2 h-4 w-4"/> Edit Vendor
                    </DropdownMenuItem>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4"/> Delete Vendor
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the vendor record.
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
                        <DialogTitle>Edit Vendor</DialogTitle>
                    </DialogHeader>
                    <VendorForm vendor={vendor} projectId={vendor.projectId} closeForm={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    );
};

const SocialsCell: React.FC<{ vendor: Vendor }> = ({ vendor }) => {
    if (!vendor.socials || vendor.socials.length === 0) return null;

    const getIcon = (platform: string) => {
        const p = platform.toLowerCase();
        if (p.includes('linkedin')) return <Linkedin className="h-4 w-4" />;
        if (p.includes('twitter')) return <Twitter className="h-4 w-4" />;
        if (p.includes('github')) return <Github className="h-4 w-4" />;
        if (p.includes('facebook')) return <Facebook className="h-4 w-4" />;
        if (p.includes('instagram')) return <Instagram className="h-4 w-4" />;
        if (p.includes('website')) return <LinkIcon className="h-4 w-4" />;
        return <CaseUpper className="h-4 w-4" />;
    };

    return (
        <div className="flex items-center gap-1">
            <TooltipProvider>
                {vendor.socials.map((social) => (
                    <Tooltip key={social.url}>
                        <TooltipTrigger asChild>
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                <Link href={social.url} target="_blank" rel="noopener noreferrer">
                                    {getIcon(social.platform)}
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{social.platform}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>
        </div>
    )
}

export const getVendorColumns = (onStar: (id: string, starred: boolean) => void): ColumnDef<Vendor>[] => [
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
            const vendor = row.original;
            return (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStar(vendor.id, !vendor.starred)}>
                    <Star className={cn("h-4 w-4", vendor.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
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
          Vendor Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium pl-4">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "serviceType",
        header: "Service Type",
        cell: ({ row }) => <Badge variant="outline">{row.getValue("serviceType")}</Badge>,
    },
    {
        accessorKey: "contactName",
        header: "Contact",
    },
    {
        id: "contactDetails",
        header: "Contact Details",
        cell: ({ row }) => {
            const vendor = row.original;
            return (
                <div className="flex items-center gap-2">
                    {vendor.email && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                        <a href={`mailto:${vendor.email}`}><Mail className="h-4 w-4"/></a>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{vendor.email}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {vendor.phone && (
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                        <a href={`tel:${vendor.phone}`}><Phone className="h-4 w-4"/></a>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{vendor.phone}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            )
        }
    },
    {
        accessorKey: "socials",
        header: "Socials",
        cell: ({ row }) => <SocialsCell vendor={row.original} />
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell vendor={row.original} />,
    },
  ];

