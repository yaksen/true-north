
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Vendor, Channel, Project } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Star, Mail, Phone, Link as LinkIcon, Linkedin, Twitter, Github, Facebook, Instagram, CaseUpper, QrCode, Save, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "../ui/dropdown-menu";
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
import Link from 'next/link';
import { QrCodeModal } from "../qr-code-modal";
import { saveContactToGoogle } from "@/app/actions/google-contacts";

interface ColumnDependencies {
    project: Project;
    channels: Channel[];
    onStar: (id: string, starred: boolean) => void;
}

interface ActionsCellProps {
  vendor: Vendor;
  dependencies: Omit<ColumnDependencies, 'onStar'>
}

const ActionsCell: React.FC<ActionsCellProps> = ({ vendor, dependencies }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isQrOpen, setIsQrOpen] = useState(false);
    const [isSavingContact, setIsSavingContact] = useState(false);

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
    
    const handleSaveToContacts = async () => {
        if (!dependencies.project.googleContactsAccessToken) {
          toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to Google Contacts in Project Settings first.'});
          return;
        }
        setIsSavingContact(true);
        try {
          const result = await saveContactToGoogle(vendor, dependencies.project.googleContactsAccessToken);
          if (result.success) {
            toast({ title: 'Success', description: result.message });
          } else {
            toast({ variant: 'destructive', title: 'Failed', description: result.message });
          }
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error', description: error.message || 'An unexpected error occurred.' });
        } finally {
          setIsSavingContact(false);
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
                    <DropdownMenuItem onClick={() => setIsQrOpen(true)}>
                        <QrCode className="mr-2 h-4 w-4" /> Show QR Code
                    </DropdownMenuItem>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSaveToContacts} disabled={isSavingContact}>
                        {isSavingContact ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                         Save to Google Contacts
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Vendor</DialogTitle>
                    </DialogHeader>
                    <VendorForm vendor={vendor} projectId={vendor.projectId} channels={dependencies.channels} closeForm={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>
            <QrCodeModal 
                isOpen={isQrOpen}
                setIsOpen={setIsQrOpen}
                contact={{...vendor, type: 'vendor'}}
            />
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

export const getVendorColumns = (dependencies: ColumnDependencies): ColumnDef<Vendor>[] => [
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => dependencies.onStar(vendor.id, !vendor.starred)}>
                    <Star className={cn("h-4 w-4", vendor.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
                </Button>
            )
        },
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "sku",
        header: "SKU",
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
        accessorKey: "channelId",
        header: "From",
        cell: ({ row }) => {
            const channelId = row.getValue("channelId") as string;
            const channel = dependencies.channels.find(c => c.id === channelId);
            return channel ? <Badge variant="outline">{channel.name}</Badge> : null;
        }
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell vendor={row.original} dependencies={dependencies} />,
    },
  ];

    
