
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Service, Category } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/services/columns';
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
import { ServiceForm } from '@/components/services/service-form';

export default function ServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const servicesQuery = query(collection(db, `users/${user.uid}/services`));
    const categoriesQuery = query(collection(db, `users/${user.uid}/categories`));

    const unsubscribeServices = onSnapshot(servicesQuery, (querySnapshot) => {
      const servicesData: Service[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        servicesData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Service);
      });
      setServices(servicesData);
      setLoading(false);
    });

    const unsubscribeCategories = onSnapshot(categoriesQuery, (querySnapshot) => {
      const categoriesData: Category[] = [];
      querySnapshot.forEach((doc) => {
        categoriesData.push({ id: doc.id, ...doc.data() } as Category);
      });
      setCategories(categoriesData);
    });

    return () => {
      unsubscribeServices();
      unsubscribeCategories();
    };
  }, [user]);

  const columns = getColumns({ categories });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Services</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PlusCircle className="h-4 w-4" />
              New Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Service</DialogTitle>
              <DialogDescription>
                Add the details of your new service below.
              </DialogDescription>
            </DialogHeader>
            <ServiceForm
              closeForm={() => setIsFormOpen(false)}
              categories={categories}
            />
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={services} />
    </>
  );
}
