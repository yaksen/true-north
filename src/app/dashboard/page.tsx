
'use client';

import { useAuth } from '@/hooks/use-auth';
import { CrmSettings, Project, Task, Finance, PersonalExpense, PersonalWallet, PersonalExpenseCategory } from '@/lib/types';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CurrencyDebug } from '@/components/debug/CurrencyDebug';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { PersonalWalletCard } from '@/components/wallet/personal-wallet-card';
import { PersonalExpenseCard } from '@/components/expenses/personal-expense-card';


export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [personalExpenseCategories, setPersonalExpenseCategories] = useState<PersonalExpenseCategory[]>([]);
  const [wallet, setWallet] = useState<PersonalWallet | null>(null);
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const projectsQuery = query(collection(db, `projects`), where('members', 'array-contains', user.uid));
    const tasksQuery = query(collection(db, 'tasks'));
    const financesQuery = query(collection(db, 'finances'));
    const personalExpensesQuery = query(collection(db, 'personalExpenses'), where('userId', '==', user.uid));
    const personalExpenseCategoriesQuery = query(collection(db, 'personalExpenseCategories'), where('userId', '==', user.uid));
    const walletQuery = query(collection(db, 'personalWallets'), where('userId', '==', user.uid));
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
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
            } as Finance;
        }));
    });

    const unsubscribePersonalExpenses = onSnapshot(personalExpensesQuery, (snapshot) => {
        setPersonalExpenses(snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as PersonalExpense;
        }));
    });

    const unsubscribePersonalExpenseCategories = onSnapshot(personalExpenseCategoriesQuery, (snapshot) => {
      setPersonalExpenseCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonalExpenseCategory)));
    });

    const unsubscribeWallet = onSnapshot(walletQuery, (snapshot) => {
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            setWallet({ id: doc.id, ...doc.data() } as PersonalWallet);
        } else {
            setWallet(null);
        }
    });
    
    const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
            setSettings(doc.data() as CrmSettings);
        }
    });
    
    // This is a bit of a hack to wait for the initial data load
    Promise.all([
        new Promise<void>(resolve => { const unsub = onSnapshot(projectsQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(tasksQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(financesQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(personalExpensesQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(personalExpenseCategoriesQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(walletQuery, () => { resolve(); unsub(); }); }),
        new Promise<void>(resolve => { const unsub = onSnapshot(settingsRef, () => { resolve(); unsub(); }); }),
    ]).then(() => setLoading(false));


    return () => {
      unsubscribeProjects();
      unsubscribeTasks();
      unsubscribeFinances();
      unsubscribePersonalExpenses();
      unsubscribePersonalExpenseCategories();
      unsubscribeWallet();
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
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <DashboardClient
              projects={projects}
              tasks={tasks}
              finances={finances}
              settings={settings}
            />
          </div>
          <div className="space-y-6 lg:space-y-8">
            <PersonalWalletCard wallet={wallet} projects={projects} />
            <PersonalExpenseCard expenses={personalExpenses} wallet={wallet} categories={personalExpenseCategories} />
          </div>
        </div>
      )}
    </>
  );
}
