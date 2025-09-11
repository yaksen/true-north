
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Action, Lead, Service, Package } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/actions/columns';
import { LogActivityDialog } from '@/components/actions/log-activity-dialog';

export default function ActionsPage() {
  const { user } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const actionsQuery = query(collection(db, `users/${user.uid}/actions`));
    const unsubscribeActions = onSnapshot(actionsQuery, (querySnapshot) => {
      const actionsData: Action[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          date: data.date?.toDate(),
          deadline: data.deadline?.toDate(),
        } as Action;
      });
      setActions(actionsData);
      setLoading(false);
    });

    const leadsQuery = query(collection(db, `users/${user.uid}/leads`));
    const unsubscribeLeads = onSnapshot(leadsQuery, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setLeads(leadsData);
    });

    const servicesQuery = query(collection(db, `users/${user.uid}/services`));
    const unsubscribeServices = onSnapshot(servicesQuery, (snapshot) => {
        setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    });

    const packagesQuery = query(collection(db, `users/${user.uid}/packages`));
    const unsubscribePackages = onSnapshot(packagesQuery, (snapshot) => {
        setPackages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Package)));
    });


    return () => {
      unsubscribeActions();
      unsubscribeLeads();
      unsubscribeServices();
      unsubscribePackages();
    };
  }, [user]);

  const columns = getColumns({ setActions });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Activity Log</h1>
        <LogActivityDialog
            leads={leads}
            services={services}
            packages={packages}
        />
      </div>
      <DataTable
        columns={columns}
        data={actions}
      />
    </>
  );
}
