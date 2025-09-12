
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Project, Task, Finance } from '@/lib/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const projectsQuery = query(collection(db, `projects`), where('members', 'array-contains', user.uid));
    const tasksQuery = query(collection(db, 'tasks'));
    const financesQuery = query(collection(db, 'finances'));

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });
    
    const unsubscribeFinances = onSnapshot(financesQuery, (snapshot) => {
        setFinances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Finance)));
    });
    
    Promise.all([
        new Promise(resolve => onSnapshot(projectsQuery, () => resolve(true))),
        new Promise(resolve => onSnapshot(tasksQuery, () => resolve(true))),
        new Promise(resolve => onSnapshot(financesQuery, () => resolve(true))),
    ]).then(() => setLoading(false));


    return () => {
      unsubscribeProjects();
      unsubscribeTasks();
      unsubscribeFinances();
    };
  }, [user]);

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Global Dashboard</h1>
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-4">
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : (
        <DashboardClient projects={projects} tasks={tasks} finances={finances} />
      )}
    </>
  );
}
