'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Lead } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/leads/columns';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LeadForm } from '@/components/leads/lead-form';

export default function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(collection(db, `users/${user.uid}/leads`));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const leadsData: Lead[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        leadsData.push({ 
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
        } as Lead);
      });
      setLeads(leadsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const columns = getColumns({
    openForm: () => setIsFormOpen(true),
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Leads</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              New Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Add the details of your new lead below.
              </DialogDescription>
            </DialogHeader>
            <LeadForm closeForm={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={leads} />
    </>
  );
}
