
'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Lead, LeadStatus, Package } from "@/lib/types";
import { ArrowUpDown, MoreHorizontal, PlusCircle, Linkedin, Twitter, Github, Link as LinkIcon } from "lucide-react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { FinanceForm } from "./finance-form";
import { TaskForm } from "./task-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import Link from "next/link";

const QuickActionDialogs: React.FC<{ lead: Lead, project: { id: string, currency: string }, packages: Package[] }> = ({ lead, project, packages }) => {
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
                    <FinanceForm project={project} leadId={lead.id} packages={packages} closeForm={() => setIsFinanceOpen(false)} />
                </DialogContent>
            </Dialog>

            <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Task for {lead.name}</DialogTitle>
                    </DialogHeader>
                    <TaskForm projectId={project.id} leadId={lead.id} closeForm={() => setIsTaskOpen(false)} />
                </DialogContent>
            </Dialog>
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
        return <LinkIcon className="h-4 w-4" />;
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


export const getLeadsColumns = (project: {id: string, currency: string}, packages: Package[]): ColumnDef<Lead>[] => [
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
            <div>
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
        id: "actions",
        cell: ({ row }) => {
          const lead = row.original;
          return <QuickActionDialogs lead={lead} project={project} packages={packages} />;
        },
      },
  ];
