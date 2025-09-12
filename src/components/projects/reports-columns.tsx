
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Report } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, Download, Eye, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { deleteDoc, doc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { deleteObject, getDownloadURL, ref } from "firebase/storage";
import { useAuth } from "@/hooks/use-auth";
import { logActivity } from "@/lib/activity-log";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { format } from 'date-fns';

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const ActionsCell: React.FC<{ report: Report }> = ({ report }) => {
    const { toast } = useToast();
    const { user } = useAuth();

    const handleAction = async (action: 'preview' | 'download') => {
        try {
            const url = await getDownloadURL(ref(storage, report.storagePath));
            window.open(url, action === 'preview' ? '_blank' : '_self');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: `Could not get file URL.` });
        }
    };

    const handleDelete = async () => {
        if (!user) return;
        try {
            await deleteObject(ref(storage, report.storagePath));
            await deleteDoc(doc(db, 'reports', report.id));
            await logActivity(report.projectId, 'report_deleted' as any, { name: report.name }, user.uid);
            toast({ title: 'Success', description: 'Report deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete report.' });
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
                <DropdownMenuItem onClick={() => handleAction('preview')}><Eye className="mr-2 h-4 w-4" />Preview</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('download')}><Download className="mr-2 h-4 w-4" />Download</DropdownMenuItem>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4"/> Delete Report
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the report file from storage.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const reportsColumns: ColumnDef<Report>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          File Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="pl-4 font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "sizeBytes",
      header: "Size",
      cell: ({ row }) => formatBytes(row.getValue("sizeBytes")),
    },
    {
      accessorKey: "uploadedAt",
      header: "Date Uploaded",
      cell: ({ row }) => {
        const date = row.getValue("uploadedAt") as Date | undefined;
        return date ? format(new Date(date), "PPP") : 'N/A';
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <ActionsCell report={row.original} />,
    },
  ];
