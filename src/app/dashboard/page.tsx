
'use client';

import { useAuth } from '@/hooks/use-auth';
import { CrmSettings, Project, Task, Finance } from '@/lib/types';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { Loader2 } from 'lucide-react';
import { CurrencyDebug } from '@/components/debug/CurrencyDebug';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const projectsQuery = query(collection(db, `projects`), where('members', 'array-contains', user.uid));
    const tasksQuery = query(collection(db, 'tasks'));
    const financesQuery = query(collection(db, 'finances'));
    const settingsRef = doc(db, 'settings', 'crm');

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });
    
    const unsubscribeFinances = onSnapshot(financesQuery, (snapshot) => {
        setFinances(snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                date: data.date.toDate(), // Convert Firestore Timestamp to Date
            } as Finance;
        }));
    });
    
    const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
            setSettings(doc.data() as CrmSettings);
        }
    });
    
    Promise.all([
        new Promise(resolve => onSnapshot(projectsQuery, () => resolve(true))),
        new Promise(resolve => onSnapshot(tasksQuery, () => resolve(true))),
        new Promise(resolve => onSnapshot(financesQuery, () => resolve(true))),
        new Promise(resolve => onSnapshot(settingsRef, () => resolve(true))),
    ]).then(() => setLoading(false));


    return () => {
      unsubscribeProjects();
      unsubscribeTasks();
      unsubscribeFinances();
      unsubscribeSettings();
    };
  }, [user]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Global Dashboard</h1>
        <CurrencyDebug />
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-lg mt-4">
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : (
        <DashboardClient projects={projects} tasks={tasks} finances={finances} settings={settings} />
      )}
    </>
  );
}
