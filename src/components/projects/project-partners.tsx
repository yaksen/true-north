
'use client';

import { useMemo, useState } from 'react';
import type { Project, Partner, Channel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { DataTable } from '../ui/data-table';
import { getPartnerColumns } from './partner-columns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { PartnerForm } from './partner-form';
import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface ProjectPartnersProps {
  project: Project;
  partners: Partner[];
  channels: Channel[];
}

export function ProjectPartners({ project, partners, channels }: ProjectPartnersProps) {
  const { toast } = useToast();
  const [isPartnerFormOpen, setIsPartnerFormOpen] = useState(false);

  const handleStar = async (id: string, starred: boolean) => {
    try {
        await updateDoc(doc(db, 'partners', id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const handleDeleteSelected = async (ids: string[]) => {
      const batch = writeBatch(db);
      ids.forEach(id => {
          batch.delete(doc(db, 'partners', id));
      });
      try {
          await batch.commit();
          toast({ title: "Success", description: `${ids.length} partner(s) deleted.`});
      } catch (error) {
          toast({ variant: 'destructive', title: "Error", description: "Could not delete selected partners."})
      }
  }
  
  const partnerColumns = useMemo(() => getPartnerColumns({ channels, onStar: handleStar }), [channels]);

  return (
    <div className="grid gap-6 mt-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Partners</CardTitle>
              <CardDescription>
                Manage all partners associated with the &quot;{project.name}&quot; project.
              </CardDescription>
            </div>
            <Dialog open={isPartnerFormOpen} onOpenChange={setIsPartnerFormOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Partner</Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Add New Partner</DialogTitle>
                </DialogHeader>
                <PartnerForm projectId={project.id} channels={channels} closeForm={() => setIsPartnerFormOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={partnerColumns} data={partners} onDeleteSelected={handleDeleteSelected} />
        </CardContent>
      </Card>
    </div>
  );
}
