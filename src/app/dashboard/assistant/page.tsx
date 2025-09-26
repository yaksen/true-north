
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { VaultItem, PersonalWallet, WalletTransaction, DiaryEntry, Task, Habit, HabitLog, PersonalExpense } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { PersonalChatbot } from '@/components/dashboard/personal-chatbot';
import { Card } from '@/components/ui/card';

export default function AssistantPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [personalWallet, setPersonalWallet] = useState<PersonalWallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubs: (()=>void)[] = [];

    // Personal Chatbot Data
    unsubs.push(onSnapshot(query(collection(db, 'tasks'), where('assigneeUid', '==', user.uid)), (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)))
    }));
    unsubs.push(onSnapshot(query(collection(db, 'habits'), where('userId', '==', user.uid)), (snapshot) => {
        setHabits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit)))
    }));
    unsubs.push(onSnapshot(query(collection(db, 'habitLogs'), where('userId', '==', user.uid)), (snapshot) => {
        setHabitLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HabitLog)))
    }));
    unsubs.push(onSnapshot(query(collection(db, 'diaryEntries'), where('userId', '==', user.uid)), (snapshot) => {
        setDiaryEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaryEntry)))
    }));
    unsubs.push(onSnapshot(query(collection(db, 'personalExpenses'), where('userId', '==', user.uid)), (snapshot) => {
        setPersonalExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PersonalExpense)))
    }));
    unsubs.push(onSnapshot(query(collection(db, 'vaultItems'), where('userId', '==', user.uid)), (snapshot) => {
        setVaultItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaultItem)))
    }));
    unsubs.push(onSnapshot(query(collection(db, 'personalWallets'), where('userId', '==', user.uid)), (snapshot) => {
        if (!snapshot.empty) {
            const walletData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PersonalWallet;
            setPersonalWallet(walletData);
            const transactionsQuery = query(collection(db, 'walletTransactions'), where('walletId', '==', walletData.id));
            unsubs.push(onSnapshot(transactionsQuery, (transSnapshot) => {
                setWalletTransactions(transSnapshot.docs.map(d => ({id: d.id, ...d.data() } as WalletTransaction)));
            }));
        } else {
            setPersonalWallet(null);
        }
    }));
    
    // Check when initial data has loaded
    const initialLoad = Promise.all([
        getDocs(query(collection(db, 'tasks'), where('assigneeUid', '==', user.uid))),
        getDocs(query(collection(db, 'habits'), where('userId', '==', user.uid))),
    ]);
    initialLoad.then(() => setLoading(false));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);

  if (loading) {
    return (
        <div className="flex h-full flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
        <div className="flex-1 max-h-[calc(100vh-10rem)]">
            <PersonalChatbot 
                tasks={tasks}
                habits={habits}
                habitLogs={habitLogs}
                diaryEntries={diaryEntries}
                wallet={personalWallet}
                walletTransactions={walletTransactions}
                vaultItems={vaultItems}
                personalExpenses={personalExpenses}
            />
        </div>
    </div>
  );
}
