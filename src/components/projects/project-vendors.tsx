
'use client';

import { useMemo, useState } from 'react';
import type { Project, Vendor } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import { DataTable } from '../ui/data-table';
import { getVendorColumns } from './vendor-columns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { VendorForm } from './vendor-form';
import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface ProjectVendorsProps {
  project: Project;
  vendors: Vendor[];
}

export function ProjectVendors({ project, vendors }: ProjectVendorsProps) {
  const { toast } = useToast();
  const [isVendorFormOpen, setIsVendorFormOpen] = useState(false);

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
  
  const vendorColumns = useMemo(() => getVendorColumns(handleStar), []);

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
            <Dialog open={isVendorFormOpen} onOpenChange={setIsVendorFormOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Vendor</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vendor</DialogTitle>
                </DialogHeader>
                <VendorForm projectId={project.id} closeForm={() => setIsVendorFormOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={vendorColumns} data={vendors} onDeleteSelected={handleDeleteSelected} />
        </CardContent>
      </Card>
    </div>
  );
}
