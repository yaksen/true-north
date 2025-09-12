
'use client';

import { useMemo, useState } from 'react';
import type { Project, Invoice, Lead } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { DataTable } from '../ui/data-table';
import { getInvoiceColumns } from '../billing/invoice-columns';

interface ProjectBillingProps {
  project: Project;
  invoices: Invoice[];
  leads: Lead[];
}

export function ProjectBilling({ project, invoices, leads }: ProjectBillingProps) {
  
  const invoiceColumns = useMemo(() => getInvoiceColumns({ projects: [project], leads }), [project, leads]);

  return (
    <div className="grid gap-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Project Billing</CardTitle>
          <CardDescription>
            All invoices associated with the &quot;{project.name}&quot; project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={invoiceColumns} data={invoices} />
        </CardContent>
      </Card>
    </div>
  );
}
