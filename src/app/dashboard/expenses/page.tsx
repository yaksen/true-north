
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { PersonalExpense } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { PersonalExpenseCard } from '@/components/expenses/personal-expense-card';

export default function PersonalExpensesPage() {
  const { user } = useAuth();
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const personalExpensesQuery = query(collection(db, 'personalExpenses'), where('userId', '==', user.uid));
    
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
        setLoading(false);
    });
    
    return () => {
      unsubscribePersonalExpenses();
    };
  }, [user]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Personal Expenses</h1>
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-lg mt-4">
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : (
        <div className='mt-6'>
           <PersonalExpenseCard expenses={personalExpenses} />
        </div>
      )}
    </>
  );
}
