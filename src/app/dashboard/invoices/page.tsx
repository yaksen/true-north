
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Invoice, Lead, Service, Package } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/invoices/columns';
import { Button } from '@/components/ui/button';
import { FilePlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { InvoiceForm } from '@/components/invoices/invoice-form';

export default function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const invoicesQuery = query(collection(db, `users/${user.uid}/invoices`));
    const leadsQuery = query(collection(db, `users/${user.uid}/leads`));
    const servicesQuery = query(collection(db, `users/${user.uid}/services`));
    const packagesQuery = query(collection(db, `users/${user.uid}/packages`));

    const unsubscribeInvoices = onSnapshot(invoicesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id,
        ...doc.data(),
        issueDate: doc.data().issueDate?.toDate(),
        dueDate: doc.data().dueDate?.toDate(),
       } as Invoice));
      setInvoices(data);
      setLoading(false);
    });

    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
    });
    
    const unsubscribeServices = onSnapshot(servicesQuery, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    });

    const unsubscribePackages = onSnapshot(packagesQuery, (snapshot) => {
      setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Package)));
    });

    return () => {
      unsubscribeInvoices();
      unsubscribeLeads();
      unsubscribeServices();
      unsubscribePackages();
    };
  }, [user]);

  const columns = getColumns({ leads });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Invoices</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <FilePlus className="h-4 w-4" />
              New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Fill out the details below to create a new invoice.
              </DialogDescription>
            </DialogHeader>
            <InvoiceForm
              closeForm={() => setIsCreateDialogOpen(false)}
              leads={leads}
              services={services}
              packages={packages}
            />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={invoices} />
    </>
  );
}
