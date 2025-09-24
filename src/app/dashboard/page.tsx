
'use client';

import { useAuth } from '@/hooks/use-auth';
import { CrmSettings, Project, Task, Finance, PersonalWallet, WalletTransaction, VaultItem, Habit, HabitLog, DiaryEntry } from '@/lib/types';
import { collection, onSnapshot, query, where, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dashboard } from '@/components/dashboard/dashboard';
import { PersonalChatbot } from '@/components/dashboard/personal-chatbot';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [settings, setSettings] = useState<CrmSettings | null>(null);

  // New state for personal chatbot data
  const [personalWallet, setPersonalWallet] = useState<PersonalWallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    const unsubs: (() => void)[] = [];

    // Existing queries
    const projectsQuery = query(collection(db, 'projects'), where('memberUids', 'array-contains', user.uid));
    const tasksQuery = query(collection(db, 'tasks')); // In a real large-scale app, this should be more targeted
    const financesQuery = query(collection(db, 'finances'));
    const settingsRef = doc(db, 'settings', 'crm');
    
    unsubs.push(onSnapshot(projectsQuery, (snapshot) => setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)))));
    unsubs.push(onSnapshot(tasksQuery, (snapshot) => setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)))));
    unsubs.push(onSnapshot(financesQuery, (snapshot) => setFinances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().date?.toDate() } as Finance)))));
    unsubs.push(onSnapshot(settingsRef, (doc) => setSettings(doc.exists() ? doc.data() as CrmSettings : null)));

    // New queries for personal data
    const personalWalletQuery = query(collection(db, 'personalWallets'), where('userId', '==', user.uid));
    const vaultItemsQuery = query(collection(db, 'vaultItems'), where('userId', '==', user.uid));
    const habitsQuery = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const habitLogsQuery = query(collection(db, 'habitLogs'), where('userId', '==', user.uid));
    const diaryEntriesQuery = query(collection(db, 'diaryEntries'), where('userId', '==', user.uid));
    
    unsubs.push(onSnapshot(personalWalletQuery, (snapshot) => {
        if (!snapshot.empty) {
            const walletData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PersonalWallet;
            setPersonalWallet(walletData);
            // Fetch transactions for this wallet
            const transactionsQuery = query(collection(db, 'walletTransactions'), where('walletId', '==', walletData.id));
            unsubs.push(onSnapshot(transactionsQuery, (transSnapshot) => {
                setWalletTransactions(transSnapshot.docs.map(d => ({id: d.id, ...d.data() } as WalletTransaction)));
            }));
        } else {
            setPersonalWallet(null);
        }
    }));
    unsubs.push(onSnapshot(vaultItemsQuery, (snapshot) => setVaultItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaultItem)))));
    unsubs.push(onSnapshot(habitsQuery, (snapshot) => setHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit)))));
    unsubs.push(onSnapshot(habitLogsQuery, (snapshot) => setHabitLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HabitLog)))));
    unsubs.push(onSnapshot(diaryEntriesQuery, (snapshot) => setDiaryEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaryEntry)))));


    const initialLoad = Promise.all([
        getDoc(doc(db, 'settings', 'crm')),
        // Using `getDocs` for initial load to avoid multiple re-renders
        getDocs(projectsQuery),
        getDocs(tasksQuery),
        getDocs(financesQuery),
        getDocs(personalWalletQuery),
        getDocs(vaultItemsQuery),
        getDocs(habitsQuery),
        getDocs(habitLogsQuery),
        getDocs(diaryEntriesQuery),
    ]);

    initialLoad.then(() => setLoading(false));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);

  const userTasks = tasks.filter(task => task.assigneeUid === user?.uid);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Global Dashboard</h1>
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-lg mt-4 h-96">
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : (
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
            <div className="xl:col-span-2 space-y-6">
                <Dashboard 
                    projects={projects}
                    tasks={tasks}
                    finances={finances}
                    settings={settings}
                />
            </div>
            <div className="xl:col-span-1">
                <Card>
                    <PersonalChatbot 
                        tasks={userTasks}
                        habits={habits}
                        habitLogs={habitLogs}
                        diaryEntries={diaryEntries}
                        wallet={personalWallet}
                        walletTransactions={walletTransactions}
                        vaultItems={vaultItems}
                    />
                </Card>
            </div>
        </div>
      )}
    </div>
  );
}
