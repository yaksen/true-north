
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Action, Lead, Service, Package } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/actions/columns';
import { LogActivityDialog } from '@/components/actions/log-activity-dialog';

export default function TasksPage() {
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

  // Custom sort to group subtasks under their parents
  const sortedActions = [...actions].sort((a, b) => {
      // If a is a subtask of b, a should come after b
      if (a.parentTaskId === b.id) return 1;
      // If b is a subtask of a, b should come after a
      if (b.parentTaskId === a.id) return -1;
      
      // Group all subtasks under their parent
      if (a.parentTaskId && b.parentTaskId) {
          if(a.parentTaskId === b.parentTaskId) return a.createdAt.getTime() - b.createdAt.getTime();
          return (a.parentTaskId > b.parentTaskId) ? 1 : -1;
      }
      if (a.parentTaskId) return 1;
      if (b.parentTaskId) return -1;

      // Otherwise, sort by creation time
      return b.createdAt.getTime() - a.createdAt.getTime();
  });


  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Tasks</h1>
        <LogActivityDialog
            leads={leads}
            services={services}
            packages={packages}
            allTasks={actions}
        />
      </div>
      <DataTable
        columns={columns}
        data={sortedActions}
      />
    </>
  );
}
