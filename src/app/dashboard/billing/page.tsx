
'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Invoice, Project, Lead } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, ReceiptText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { InvoiceForm } from '@/components/billing/invoice-form';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BillingToolbar } from '@/components/billing/billing-toolbar';
import { InvoiceCard } from '@/components/billing/invoice-card';

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    status: 'all',
    leadId: 'all',
    search: ''
  });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    // Subscribe to all collections needed
    const qProjects = query(collection(db, `projects`), where('members', 'array-contains', user.uid));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    const qLeads = query(collection(db, 'leads')); // In a real app, this should be scoped by project
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
    });

    const qInvoices = query(collection(db, 'invoices')); // In a real app, this should be scoped by project
    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
      setLoading(false);
    });

    return () => {
      unsubscribeProjects();
      unsubscribeLeads();
      unsubscribeInvoices();
    };
  }, [user]);
  
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
        const projectMatch = projects.some(p => p.id === invoice.projectId);
        if (!projectMatch) return false;

        const statusMatch = filters.status === 'all' || invoice.status === filters.status;
        const leadMatch = filters.leadId === 'all' || invoice.leadId === filters.leadId;
        const searchMatch = !filters.search || invoice.invoiceNumber.toLowerCase().includes(filters.search.toLowerCase());
        
        return statusMatch && leadMatch && searchMatch;
    });
  }, [invoices, projects, filters]);


  const findProjectForInvoice = (invoice: Invoice) => {
    return projects.find(p => p.id === invoice.projectId);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Billing</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Fill out the details for the new invoice.
              </DialogDescription>
            </DialogHeader>
            <InvoiceForm
              projects={projects}
              leads={leads}
              closeForm={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>A list of all invoices across your projects.</CardDescription>
        </CardHeader>
        <CardContent>
          <BillingToolbar leads={leads} onFilterChange={setFilters} />
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredInvoices.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-30rem)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
                    {filteredInvoices.map(invoice => {
                        const project = findProjectForInvoice(invoice);
                        if (!project) return null;
                        return (
                            <InvoiceCard
                                key={invoice.id}
                                invoice={invoice}
                                project={project}
                                leads={leads}
                            />
                        )
                    })}
                </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground py-12">
                <ReceiptText className="mx-auto h-12 w-12" />
                <p className="mt-4">No invoices found. Create your first invoice to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
