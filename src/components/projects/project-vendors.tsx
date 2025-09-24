
'use client';

import { useMemo, useState } from 'react';
import type { Project, Vendor, Channel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { PlusCircle, Contact, Loader2 } from 'lucide-react';
import { DataTable } from '../ui/data-table';
import { getVendorColumns } from './vendor-columns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { VendorForm } from './vendor-form';
import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { saveContactToGoogle } from '@/app/actions/google-contacts';
import { Input } from '../ui/input';

interface ProjectVendorsProps {
  project: Project;
  vendors: Vendor[];
  channels: Channel[];
}

export function ProjectVendors({ project, vendors, channels }: ProjectVendorsProps) {
  const { toast } = useToast();
  const [isVendorFormOpen, setIsVendorFormOpen] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');

  const handleStar = async (id: string, starred: boolean) => {
    try {
        await updateDoc(doc(db, 'vendors', id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const handleDeleteSelected = async (ids: string[]) => {
      const batch = writeBatch(db);
      ids.forEach(id => {
          batch.delete(doc(db, 'vendors', id));
      });
      try {
          await batch.commit();
          toast({ title: "Success", description: `${ids.length} vendor(s) deleted.`});
      } catch (error) {
          toast({ variant: 'destructive', title: "Error", description: "Could not delete selected vendors."})
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

    for (const vendor of vendors) {
        const result = await saveContactToGoogle(vendor, project.googleContactsAccessToken);
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

  const vendorColumns = useMemo(() => getVendorColumns({ project, channels, onStar: handleStar }), [project, channels]);
  
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
        const serviceMatch = !serviceTypeFilter || v.serviceType.toLowerCase().includes(serviceTypeFilter.toLowerCase());
        return serviceMatch;
    });
  }, [vendors, serviceTypeFilter]);

  const Toolbar = () => (
    <div className="flex items-center gap-2">
        <Input 
            placeholder="Filter by service type..."
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="h-9 w-48"
        />
        {serviceTypeFilter && (
            <Button variant="ghost" size="sm" onClick={() => setServiceTypeFilter('')}>
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
              <CardTitle>Vendors</CardTitle>
              <CardDescription>
                Manage all vendors associated with the &quot;{project.name}&quot; project.
              </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
                <Button size="sm" variant="outline" onClick={handleBulkSaveToContacts} disabled={isBulkSaving || !project.googleContactsAccessToken}>
                    {isBulkSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Contact className="mr-2 h-4 w-4" />}
                    Save All to Contacts
                </Button>
                <Dialog open={isVendorFormOpen} onOpenChange={setIsVendorFormOpen}>
                <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Vendor</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                    <DialogTitle>Add New Vendor</DialogTitle>
                    </DialogHeader>
                    <VendorForm projectId={project.id} channels={channels} closeForm={() => setIsVendorFormOpen(false)} />
                </DialogContent>
                </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={vendorColumns} 
            data={filteredVendors} 
            onDeleteSelected={handleDeleteSelected}
            toolbar={<Toolbar />}
          />
        </CardContent>
      </Card>
    </div>
  );
}
