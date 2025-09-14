
'use client';

import { useAuth } from '@/hooks/use-auth';
import { CrmSettings, Project, Task, Finance } from '@/lib/types';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dashboard } from '@/components/dashboard/dashboard';

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

    const projectsQuery = query(collection(db, 'projects'), where('members', 'array-contains', user.uid));
    const tasksQuery = query(collection(db, 'tasks')); // Consider adding a project filter here
    const financesQuery = query(collection(db, 'finances')); // Consider adding a project filter here
    const settingsRef = doc(db, 'settings', 'crm');
    
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(projectsQuery, (snapshot) => setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)))));
    unsubs.push(onSnapshot(tasksQuery, (snapshot) => setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)))));
    unsubs.push(onSnapshot(financesQuery, (snapshot) => setFinances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().date?.toDate() } as Finance)))));
    unsubs.push(onSnapshot(settingsRef, (doc) => setSettings(doc.exists() ? doc.data() as CrmSettings : null)));

    const initialLoad = Promise.all([
        new Promise<void>(resolve => { const unsub = onSnapshot(projectsQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(tasksQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(financesQuery, () => { resolve(); unsub(); }); }),
    ]);

    initialLoad.then(() => setLoading(false));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Global Dashboard</h1>
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-lg mt-4 h-96">
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : (
        <Dashboard 
            projects={projects}
            tasks={tasks}
            finances={finances}
            settings={settings}
        />
      )}
    </>
  );
}
