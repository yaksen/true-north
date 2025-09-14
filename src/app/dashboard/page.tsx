
'use client';

import { useAuth } from '@/hooks/use-auth';
import { CrmSettings, Project, Task, Finance, PersonalExpense, PersonalWallet, PersonalExpenseCategory } from '@/lib/types';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CurrencyDebug } from '@/components/debug/CurrencyDebug';
import { DraggableDashboard } from '@/components/dashboard/draggable-dashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [personalWallet, setPersonalWallet] = useState<PersonalWallet | null>(null);
  const [personalExpenseCategories, setPersonalExpenseCategories] = useState<PersonalExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const projectsQuery = query(collection(db, 'projects'), where('members', 'array-contains', user.uid));
    const tasksQuery = query(collection(db, 'tasks')); // Consider adding a project filter here
    const financesQuery = query(collection(db, 'finances')); // Consider adding a project filter here
    const settingsRef = doc(db, 'settings', 'crm');
    const expensesQuery = query(collection(db, 'personalExpenses'), where('userId', '==', user.uid));
    const walletRef = doc(db, 'personalWallets', user.uid);
    const categoriesQuery = query(collection(db, 'personalExpenseCategories'), where('userId', '==', user.uid));

    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(projectsQuery, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }));

    unsubs.push(onSnapshot(tasksQuery, (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }));
    
    unsubs.push(onSnapshot(financesQuery, (snapshot) => {
        setFinances(snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
            } as Finance;
        }));
    }));
    
    unsubs.push(onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
            setSettings(doc.data() as CrmSettings);
        }
    }));

    unsubs.push(onSnapshot(expensesQuery, (snapshot) => {
      setPersonalExpenses(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        date: doc.data().date.toDate(),
      } as PersonalExpense)));
    }));

    unsubs.push(onSnapshot(walletRef, (doc) => {
      if (doc.exists()) {
        setPersonalWallet({ id: doc.id, ...doc.data() } as PersonalWallet);
      }
    }));

     unsubs.push(onSnapshot(categoriesQuery, (snapshot) => {
      setPersonalExpenseCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonalExpenseCategory)));
    }));

    // Initial data load promise
    const initialLoad = Promise.all([
        new Promise<void>(resolve => { const unsub = onSnapshot(projectsQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(tasksQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(financesQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(settingsRef, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(expensesQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(walletRef, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(categoriesQuery, () => { resolve(); unsub(); }); }),
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
        <CurrencyDebug />
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-lg mt-4 h-96">
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : (
        <DraggableDashboard 
            projects={projects}
            tasks={tasks}
            finances={finances}
            settings={settings}
            personalExpenses={personalExpenses}
            wallet={personalWallet}
            personalExpenseCategories={personalExpenseCategories}
        />
      )}
    </>
  );
}
