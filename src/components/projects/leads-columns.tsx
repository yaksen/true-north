
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Lead, LeadStatus, Package, Service, Project, Channel } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, PlusCircle, Linkedin, Twitter, Github, Link as LinkIcon, Edit, Trash2, Facebook, Instagram, CaseUpper, Star, QrCode, Contact as ContactIcon, Loader2, Save } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { FinanceForm } from "./finance-form";
import { TaskForm } from "./task-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import Link from "next/link";
import { LeadForm } from "./lead-form";
import { Checkbox } from "../ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logActivity } from "@/lib/activity-log";
import { cn } from "@/lib/utils";
import { QrCodeModal } from "../qr-code-modal";
import { saveLeadToGoogleContacts } from "@/app/actions/google-contacts";


interface ColumnDependencies {
    project: Project;
    packages: Package[];
    services: Service[];
    channels: Channel[];
}

const ActionsCell: React.FC<{ lead: Lead, dependencies: ColumnDependencies }> = ({ lead, dependencies }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isFinanceOpen, setIsFinanceOpen] = useState(false);
    const [isTaskOpen, setIsTaskOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isQrOpen, setIsQrOpen] = useState(false);
    const [isSavingContact, setIsSavingContact] = useState(false);

    const handleDelete = async () => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'leads', lead.id));
            await logActivity(lead.projectId, 'lead_deleted', { name: lead.name }, user.uid);
            toast({ title: 'Success', description: 'Lead deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete lead.' });
        }
    };

    const handleSaveToContacts = async () => {
      if (!dependencies.project.googleContactsAccessToken) {
        toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to Google Contacts in Project Settings first.'});
        return;
      }
      setIsSavingContact(true);
      try {
        const result = await saveLeadToGoogleContacts(lead, dependencies.project.googleContactsAccessToken);
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
                        <Edit className="mr-2 h-4 w-4" /> Edit Lead
                    </DropdownMenuItem>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Lead
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the lead. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleSaveToContacts} disabled={isSavingContact}>
                        {isSavingContact ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                         Save to Google Contacts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsFinanceOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Log Finance
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsTaskOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isFinanceOpen} onOpenChange={setIsFinanceOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Log Finance for {lead.name}</DialogTitle>
                    </DialogHeader>
                    <FinanceForm project={dependencies.project} leadId={lead.id} packages={dependencies.packages} services={dependencies.services} closeForm={() => setIsFinanceOpen(false)} />
                </DialogContent>
            </Dialog>

            <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Add Task for {lead.name}</DialogTitle>
                    </DialogHeader>
                    <TaskForm projectId={dependencies.project.id} leadId={lead.id} members={dependencies.project.members} closeForm={() => setIsTaskOpen(false)} />
                </DialogContent>
            </Dialog>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Lead</DialogTitle>
                    </DialogHeader>
                    <LeadForm lead={lead} projectId={dependencies.project.id} channels={dependencies.channels} closeForm={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>
            
            <QrCodeModal 
                isOpen={isQrOpen}
                setIsOpen={setIsQrOpen}
                contact={{...lead, type: 'lead'}}
                organization={dependencies.project.name}
            />
        </>
    );
};

const SocialsCell: React.FC<{ lead: Lead }> = ({ lead }) => {
    if (!lead.socials || lead.socials.length === 0) return null;

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
        <div className="flex items-center gap-2">
            <TooltipProvider>
                {lead.socials.map((social) => (
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


export const getLeadsColumns = (dependencies: ColumnDependencies): ColumnDef<Lead>[] => [
    {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
            checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
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
            const lead = row.original;
            return (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => (dependencies as any).onStar(lead.id, !lead.starred)}>
                    <Star className={cn("h-4 w-4", lead.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
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
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const lead = row.original;
        return (
            <div className="pl-4">
                <p className="font-medium">{lead.name}</p>
                <p className="text-xs text-muted-foreground">{lead.email}</p>
            </div>
        )
      }
    },
    {
        accessorKey: "phone",
        header: "Phone",
    },
    {
        accessorKey: "socials",
        header: "Socials",
        cell: ({ row }) => <SocialsCell lead={row.original} />
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as LeadStatus;
        let variant: "default" | "secondary" | "destructive" = "secondary";
        if (status === 'converted') variant = 'default';
        if (status === 'lost') variant = 'destructive';
        return <Badge variant={variant} className="capitalize">{status}</Badge>
      }
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
        cell: ({ row }) => {
          const lead = row.original;
          return <ActionsCell lead={lead} dependencies={dependencies} />;
        },
      },
  ];

    
