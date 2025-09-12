
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Lead, LeadStatus } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, PlusCircle } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { FinanceForm } from "./finance-form";
import { TaskForm } from "./task-form";

const QuickActionDialogs: React.FC<{ lead: Lead, projectId: string }> = ({ lead, projectId }) => {
    const [isFinanceOpen, setIsFinanceOpen] = useState(false);
    const [isTaskOpen, setIsTaskOpen] = useState(false);

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
                    <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setIsFinanceOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Log Finance
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsTaskOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Task
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>View Lead Details</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isFinanceOpen} onOpenChange={setIsFinanceOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Log Finance for {lead.name}</DialogTitle>
                    </DialogHeader>
                    <FinanceForm projectId={projectId} leadId={lead.id} closeForm={() => setIsFinanceOpen(false)} />
                </DialogContent>
            </Dialog>

            <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Task for {lead.name}</DialogTitle>
                    </DialogHeader>
                    <TaskForm projectId={projectId} leadId={lead.id} closeForm={() => setIsTaskOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    );
};


export const leadsColumns: ColumnDef<Lead>[] = [
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
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "phone",
        header: "Phone",
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
        id: "actions",
        cell: ({ row }) => {
          const lead = row.original;
          return <QuickActionDialogs lead={lead} projectId={lead.projectId} />;
        },
      },
  ];
