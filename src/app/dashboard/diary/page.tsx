
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { DiaryEntry } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { DiaryClient } from '@/components/diary/diary-client';

export default function DiaryPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const entriesQuery = query(collection(db, 'diaryEntries'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(entriesQuery, (snapshot) => {
        setEntries(snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
            } as DiaryEntry;
        }));
        setLoading(false);
    });

    return () => unsubscribe();
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
        <h1 className="text-2xl font-bold tracking-tight">Personal Diary</h1>
      </div>
      
      <div className='mt-6'>
         <DiaryClient entries={entries} />
      </div>
    </>
  );
}
