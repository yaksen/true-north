
'use client';

import { useMemo, useState } from 'react';
import type { Project, Invoice, Lead } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { DataTable } from '../ui/data-table';
import { getInvoiceColumns } from '../billing/invoice-columns';
import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface ProjectBillingProps {
  project: Project;
  invoices: Invoice[];
  leads: Lead[];
}

export function ProjectBilling({ project, invoices, leads }: ProjectBillingProps) {
  const { toast } = useToast();

  const handleStar = async (id: string, starred: boolean) => {
    try {
        await updateDoc(doc(db, 'invoices', id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const handleDeleteSelected = async (ids: string[]) => {
      const batch = writeBatch(db);
      ids.forEach(id => {
          batch.delete(doc(db, 'invoices', id));
      });
      try {
          await batch.commit();
          toast({ title: "Success", description: `${ids.length} invoice(s) deleted.`});
      } catch (error) {
          toast({ variant: 'destructive', title: "Error", description: "Could not delete selected invoices."})
      }
  }
  
  const invoiceColumns = useMemo(() => getInvoiceColumns({ projects: [project], leads, onStar: handleStar }), [project, leads]);

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
          <DataTable columns={invoiceColumns} data={invoices} onDeleteSelected={handleDeleteSelected} />
        </CardContent>
      </Card>
    </div>
  );
}
