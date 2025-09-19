

'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Project, Finance } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { GlobalFinanceClient } from '@/components/finance/global-finance-client';

export default function GlobalFinancePage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const projectsQuery = query(collection(db, 'projects'), where('members', 'array-contains', user.uid));
    
    const unsubscribeProjects = onSnapshot(projectsQuery, (projectsSnapshot) => {
      const projectsData = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(projectsData);
      
      if (projectsData.length === 0) {
        setFinances([]);
        setLoading(false);
        return;
      }

      const projectIds = projectsData.map(p => p.id);
      // Firestore 'in' query is limited to 30 values. For more projects, batching would be needed.
      const financesQuery = query(collection(db, 'finances'), where('projectId', 'in', projectIds));
      
      const unsubscribeFinances = onSnapshot(financesQuery, (financesSnapshot) => {
        const financesData = financesSnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                id: doc.id, 
                ...data,
                date: data.date?.toDate ? data.date.toDate() : new Date(data.date), 
            } as Finance
        });
        setFinances(financesData);
        setLoading(false);
      });

      return () => unsubscribeFinances();
    });

    return () => unsubscribeProjects();
  }, [user]);

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Global Finance</h1>
      </div>
      {loading ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-4">
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : (
        <GlobalFinanceClient projects={projects} finances={finances} />
      )}
    </>
  );
}
