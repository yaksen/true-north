

'use client';

import { useMemo, useState } from 'react';
import type { Project, Vendor, Channel } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { PlusCircle, Contact, Loader2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { VendorForm } from './vendor-form';
import { useToast } from '@/hooks/use-toast';
import { VendorsToolbar } from './vendors-toolbar';
import { VendorCard } from './vendor-card';
import { ScrollArea } from '../ui/scroll-area';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { exportToGoogleContactsCSV } from '@/lib/utils';

interface ProjectVendorsProps {
  project: Project;
  vendors: Vendor[];
  channels: Channel[];
}

export function ProjectVendors({ project, vendors, channels }: ProjectVendorsProps) {
  const { toast } = useToast();
  const [isVendorFormOpen, setIsVendorFormOpen] = useState(false);
  const [filters, setFilters] = useState({
    serviceType: '',
    search: '',
  });

  const handleStar = async (id: string, starred: boolean) => {
    try {
        await updateDoc(doc(db, 'vendors', id), { starred });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Could not update star status."})
    }
  }

  const filteredVendors = useMemo(() => {
    const sortedVendors = [...vendors].sort((a, b) => {
        if (a.starred && !b.starred) return -1;
        if (!a.starred && b.starred) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sortedVendors.filter(v => {
        const serviceMatch = !filters.serviceType || v.serviceType.toLowerCase().includes(filters.serviceType.toLowerCase());
        const searchMatch = !filters.search ||
            v.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            (v.contactName && v.contactName.toLowerCase().includes(filters.search.toLowerCase()));

        return serviceMatch && searchMatch;
    });
  }, [vendors, filters]);

  const handleExport = () => {
    if (filteredVendors.length === 0) {
        toast({ description: "No vendors to export."});
        return;
    }
    exportToGoogleContactsCSV(filteredVendors, 'vendors');
  }

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
                <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredVendors.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Contacts
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
            <VendorsToolbar onFilterChange={setFilters} />
            <ScrollArea className="h-[calc(100vh-30rem)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                    {filteredVendors.map(vendor => (
                        <VendorCard 
                            key={vendor.id}
                            vendor={vendor}
                            dependencies={{ project, channels, onStar: handleStar }}
                        />
                    ))}
                </div>
            </ScrollArea>
             {filteredVendors.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                    <p>No vendors found for the selected filters.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
