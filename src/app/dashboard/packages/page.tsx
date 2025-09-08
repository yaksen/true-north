
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="destructive" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              New Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Package</DialogTitle>
              <DialogDescription>
                Add the details of your new package below.
              </DialogDescription>
            </DialogHeader>
            <PackageForm
              closeForm={() => setIsCreateDialogOpen(false)}
              services={services}
            />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable
        columns={columns}
        data={packages}
        filterColumn="name"
        filterColumnName="Name"
       />
    </>
  );
}
