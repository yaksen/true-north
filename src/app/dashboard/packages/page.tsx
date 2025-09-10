
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Package, Service } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/packages/columns';
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
import { PackageForm } from '@/components/packages/package-form';

export default function PackagesPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFixedDialogOpen, setIsFixedDialogOpen] = useState(false);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const packagesQuery = query(collection(db, `users/${user.uid}/packages`));
    const servicesQuery = query(collection(db, `users/${user.uid}/services`));

    const unsubscribePackages = onSnapshot(packagesQuery, (querySnapshot) => {
      const packagesData: Package[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        packagesData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Package);
      });
      setPackages(packagesData);
      setLoading(false);
    });

    const unsubscribeServices = onSnapshot(servicesQuery, (querySnapshot) => {
      const servicesData: Service[] = [];
      querySnapshot.forEach((doc) => {
        servicesData.push({ id: doc.id, ...doc.data() } as Service);
      });
      setServices(servicesData);
    });

    return () => {
      unsubscribePackages();
      unsubscribeServices();
    };
  }, [user]);

  const columns = getColumns({ services, setPackages });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Packages</h1>
        <div className="flex gap-2">
          <Dialog open={isFixedDialogOpen} onOpenChange={setIsFixedDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <PlusCircle className="h-4 w-4" />
                New Fixed Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Fixed Package</DialogTitle>
                <DialogDescription>
                  Add the details of your new package below.
                </DialogDescription>
              </DialogHeader>
              <PackageForm
                closeForm={() => setIsFixedDialogOpen(false)}
                services={services}
                packageCategory="fixed"
              />
            </DialogContent>
          </Dialog>
           <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <PlusCircle className="h-4 w-4" />
                New Custom Package
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Custom Package</DialogTitle>
                <DialogDescription>
                  Add the details of your new custom package below.
                </DialogDescription>
              </DialogHeader>
              <PackageForm
                closeForm={() => setIsCustomDialogOpen(false)}
                services={services}
                packageCategory="custom"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={packages}
       />
    </>
  );
}
