
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Channel, ChannelStatus, Project } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, Star, PlusCircle } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logActivity } from "@/lib/activity-log";
import { cn } from "@/lib/utils";
import { ChannelForm } from "./channel-form";
import { Checkbox } from "../ui/checkbox";
import { FinanceForm } from "./finance-form";


const ActionsCell: React.FC<{ channel: Channel, project: Project }> = ({ channel, project }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isFinanceOpen, setIsFinanceOpen] = useState(false);

    const handleDelete = async () => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'channels', channel.id));
            await logActivity(channel.projectId, 'channel_deleted', { name: channel.name }, user.uid);
            toast({ title: 'Success', description: 'Channel deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete channel.' });
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
                        <Edit className="mr-2 h-4 w-4" /> Edit Channel
                    </DropdownMenuItem>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Channel
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the channel. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => setIsFinanceOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Log Finance
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Channel</DialogTitle>
                    </DialogHeader>
                    <ChannelForm channel={channel} projectId={project.id} closeForm={() => setIsEditOpen(false)} />
                </DialogContent>
            </Dialog>

            <Dialog open={isFinanceOpen} onOpenChange={setIsFinanceOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Log Finance for {channel.name}</DialogTitle>
                    </DialogHeader>
                    <FinanceForm project={project} channelId={channel.id} closeForm={() => setIsFinanceOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    );
};


export const getChannelsColumns = (project: Project, onStar: (id: string, starred: boolean) => void): ColumnDef<Channel>[] => [
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
            const channel = row.original;
            return (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStar(channel.id, !channel.starred)}>
                    <Star className={cn("h-4 w-4", channel.starred ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground')} />
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
        const channel = row.original;
        return (
            <div className="pl-4">
                <p className="font-medium">{channel.name}</p>
                <p className="text-xs text-muted-foreground">{channel.url}</p>
            </div>
        )
      }
    },
    {
        accessorKey: "platform",
        header: "Platform",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as ChannelStatus;
        let variant: "default" | "secondary" | "destructive" = "secondary";
        if (status === 'active') variant = 'default';
        if (status === 'closed') variant = 'destructive';
        return <Badge variant={variant} className="capitalize">{status}</Badge>
      }
    },
    {
        id: "actions",
        cell: ({ row }) => {
          const channel = row.original;
          return <ActionsCell channel={channel} project={project} />;
        },
      },
  ];
