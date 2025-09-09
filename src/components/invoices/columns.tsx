
'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { Invoice, Lead, InvoiceStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ColumnsProps {
    leads: Lead[];
}

const statusColors: Record<InvoiceStatus, string> = {
    draft: 'bg-gray-500',
    sent: 'bg-blue-500',
    paid: 'bg-green-500',
    overdue: 'bg-red-500',
    void: 'bg-neutral-700',
};

export const getColumns = ({ leads }: ColumnsProps): ColumnDef<Invoice>[] => [
  {
    accessorKey: 'invoiceNumber',
    header: 'Invoice #',
  },
  {
    accessorKey: 'leadId',
    header: 'Customer',
    cell: ({ row }) => {
      const leadId = row.getValue('leadId') as string;
      const lead = leads.find(l => l.id === leadId);
      return <div>{lead?.name || 'Unknown'}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as InvoiceStatus;
      return <Badge className={`capitalize ${statusColors[status]}`}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'issueDate',
    header: 'Issue Date',
    cell: ({ row }) => {
      const date = row.getValue('issueDate') as Date;
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => {
      const date = row.getValue('dueDate') as Date;
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: 'totalLKR',
    header: 'Total (LKR)',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('totalLKR'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'LKR',
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: function Actions({ row }) {
      const invoice = row.original;
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
            <DropdownMenuItem>View Invoice</DropdownMenuItem>
            <DropdownMenuItem>Mark as Paid</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
