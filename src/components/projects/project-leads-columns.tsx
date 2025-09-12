
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Lead, LeadState } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { LogActivityDialog } from '../actions/log-activity-dialog';

export const getProjectLeadsColumns = (): ColumnDef<Lead>[] => [
  {
    accessorKey: 'leadId',
    header: 'Lead ID',
    cell: ({ row }) => <div className="font-mono text-muted-foreground">#{row.original.leadId}</div>,
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const router = useRouter();
      return (
        <div 
          className="font-medium cursor-pointer hover:underline"
          onClick={() => router.push(`/dashboard/leads/${row.original.id}`)}
        >
          {row.original.name}
        </div>
      )
    },
  },
  {
    accessorKey: 'emails',
    header: 'Email',
    cell: ({ row }) => {
      const emails = row.getValue('emails') as string[];
      return <div>{emails?.[0] || 'N/A'}</div>;
    },
  },
  {
    accessorKey: 'state',
    header: 'State',
    cell: ({ row }) => {
      const state = row.getValue('state') as LeadState;
      return <Badge variant="outline" className="capitalize">{state}</Badge>;
    },
  },
  {
    id: 'actions',
    cell: function Actions({ row }) {
      const lead = row.original;
      const router = useRouter();

      return (
        <div className="flex items-center justify-end gap-2">
            <LogActivityDialog leads={[lead]} services={[]} packages={[]} />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => router.push(`/dashboard/leads/${lead.id}`)}>
                        View Full Details
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      );
    },
  },
];
