

'use client';

import { useMemo, useState } from 'react';
import type { Project, Partner, Channel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { PlusCircle, Contact, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { PartnerForm } from './partner-form';
import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { saveContactToGoogle } from '@/app/actions/google-contacts';
import { PartnersToolbar } from './partners-toolbar';
import { PartnerCard } from './partner-card';
import { ScrollArea } from '../ui/scroll-area';

interface ProjectPartnersProps {
  project: Project;
  partners: Partner[];
  channels: Channel[];
}

export function ProjectPartners({ project, partners, channels }: ProjectPartnersProps) {
  const { toast } = useToast();
  const [isPartnerFormOpen, setIsPartnerFormOpen] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [filters, setFilters] = useState({
    role: '',
    search: '',
  });

  const handleStar = async (id: string, starred: boolean) => {
    try {
        await updateDoc(doc(db, 'partners', id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const filteredPartners = useMemo(() => {
    const sortedPartners = [...partners].sort((a, b) => {
        if (a.starred && !b.starred) return -1;
        if (!a.starred && b.starred) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sortedPartners.filter(p => {
        const roleMatch = !filters.role || p.roleInProject.toLowerCase().includes(filters.role.toLowerCase());
        const searchMatch = !filters.search ||
            p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            (p.contactName && p.contactName.toLowerCase().includes(filters.search.toLowerCase()));

        return roleMatch && searchMatch;
    });
  }, [partners, filters]);

  const handleBulkSaveToContacts = async () => {
    if (!project.googleContactsAccessToken) {
        toast({ variant: 'destructive', title: 'Not Connected', description: 'Please connect to Google Contacts in Project Settings first.'});
        return;
    }
    setIsBulkSaving(true);
    let successCount = 0;
    let existCount = 0;
    let failCount = 0;

    for (const partner of filteredPartners) {
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
            <PartnersToolbar onFilterChange={setFilters} />
            <ScrollArea className="h-[calc(100vh-30rem)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                    {filteredPartners.map(partner => (
                        <PartnerCard 
                            key={partner.id}
                            partner={partner}
                            dependencies={{ project, channels, onStar: handleStar }}
                        />
                    ))}
                </div>
            </ScrollArea>
             {filteredPartners.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                    <p>No partners found for the selected filters.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
