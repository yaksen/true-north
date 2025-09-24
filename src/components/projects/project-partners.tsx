
'use client';

import { useMemo, useState } from 'react';
import type { Project, Partner, Channel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { PlusCircle, Contact, Loader2 } from 'lucide-react';
import { DataTable } from '../ui/data-table';
import { getPartnerColumns } from './partner-columns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { PartnerForm } from './partner-form';
import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { saveContactToGoogle } from '@/app/actions/google-contacts';
import { Input } from '../ui/input';

interface ProjectPartnersProps {
  project: Project;
  partners: Partner[];
  channels: Channel[];
}

export function ProjectPartners({ project, partners, channels }: ProjectPartnersProps) {
  const { toast } = useToast();
  const [isPartnerFormOpen, setIsPartnerFormOpen] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');

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
  
  const handleBulkSaveToContacts = async () => {
    if (!project.googleContactsAccessToken) {
        toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to Google Contacts in Project Settings first.'});
        return;
    }
    setIsBulkSaving(true);
    let successCount = 0;
    let existCount = 0;
    let failCount = 0;

    for (const partner of partners) {
        const result = await saveContactToGoogle(partner, project.googleContactsAccessToken);
        if (result.success) {
            successCount++;
        } else if (result.message.includes('already exists')) {
            existCount++;
        } else {
            failCount++;
        }
    }

    setIsBulkSaving(false);
    toast({
        title: 'Bulk Save Complete',
        description: `${successCount} new contacts saved, ${existCount} already existed, and ${failCount} failed.`,
    });
  }

  const partnerColumns = useMemo(() => getPartnerColumns({ project, channels, onStar: handleStar }), [project, channels]);

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
        const roleMatch = !roleFilter || p.roleInProject.toLowerCase().includes(roleFilter.toLowerCase());
        return roleMatch;
    });
  }, [partners, roleFilter]);

  const Toolbar = () => (
    <div className="flex items-center gap-2">
        <Input 
            placeholder="Filter by role..."
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 w-48"
        />
        {roleFilter && (
            <Button variant="ghost" size="sm" onClick={() => setRoleFilter('')}>
                Clear Filter
            </Button>
        )}
    </div>
  );

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
            <div className='flex items-center gap-2'>
                <Button size="sm" variant="outline" onClick={handleBulkSaveToContacts} disabled={isBulkSaving || !project.googleContactsAccessToken}>
                    {isBulkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Contact className="mr-2 h-4 w-4" />}
                    Save All to Contacts
                </Button>
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
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={partnerColumns} 
            data={filteredPartners} 
            onDeleteSelected={handleDeleteSelected}
            toolbar={<Toolbar />}
          />
        </CardContent>
      </Card>
    </div>
  );
}
