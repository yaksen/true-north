
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Habit, HabitLog } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { HabitDashboard } from '@/components/habits/habit-dashboard';

export default function HabitsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    
    const habitsQuery = query(collection(db, `habits`), where('userId', '==', user.uid));
    const unsubscribeHabits = onSnapshot(habitsQuery, (snapshot) => {
      setHabits(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      } as Habit)));
      setLoading(false);
    });

    const logsQuery = query(collection(db, 'habitLogs'), where('userId', '==', user.uid));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
        setHabitLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HabitLog)));
    });


    return () => {
      unsubscribeHabits();
      unsubscribeLogs();
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
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Habit Tracker</h1>
      </div>
      
      <div className='mt-6'>
         <HabitDashboard habits={habits} logs={habitLogs} />
      </div>
    </>
  );
}
