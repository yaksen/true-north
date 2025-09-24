
'use client';

import { useMemo, useState } from 'react';
import type { Project, Invoice, Lead } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { BillingToolbar } from '../billing/billing-toolbar';
import { InvoiceCard } from '../billing/invoice-card';
import { ScrollArea } from '../ui/scroll-area';

interface ProjectBillingProps {
  project: Project;
  invoices: Invoice[];
  leads: Lead[];
}

export function ProjectBilling({ project, invoices, leads }: ProjectBillingProps) {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    status: 'all',
    leadId: 'all',
    search: ''
  });
  
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
        const statusMatch = filters.status === 'all' || invoice.status === filters.status;
        const leadMatch = filters.leadId === 'all' || invoice.leadId === filters.leadId;
        const searchMatch = !filters.search || invoice.invoiceNumber.toLowerCase().includes(filters.search.toLowerCase());
        return statusMatch && leadMatch && searchMatch;
    });
  }, [invoices, filters]);


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
            <BillingToolbar leads={leads} onFilterChange={setFilters} />
             <ScrollArea className="h-[calc(100vh-30rem)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                    {filteredInvoices.map(invoice => (
                        <InvoiceCard 
                            key={invoice.id}
                            invoice={invoice}
                            project={project}
                            leads={leads}
                        />
                    ))}
                </div>
            </ScrollArea>
             {filteredInvoices.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                    <p>No invoices found for the selected filters.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
