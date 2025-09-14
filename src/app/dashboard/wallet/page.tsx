
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { PersonalWallet, WalletTransaction, Project } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { PersonalWalletCard } from '@/components/wallet/personal-wallet-card';
import { WalletTransactions } from '@/components/wallet/wallet-transactions';

export default function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<PersonalWallet | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const walletQuery = query(collection(db, 'personalWallets'), where('userId', '==', user.uid));
    const unsubscribeWallet = onSnapshot(walletQuery, (snapshot) => {
      if (!snapshot.empty) {
        const walletDoc = snapshot.docs[0];
        const walletData = { id: walletDoc.id, ...walletDoc.data() } as PersonalWallet;
        setWallet(walletData);

        // Fetch transactions for this wallet
        const transactionsQuery = query(collection(db, 'walletTransactions'), where('walletId', '==', walletData.id));
        const unsubscribeTransactions = onSnapshot(transactionsQuery, (transSnapshot) => {
          setTransactions(transSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
            } as WalletTransaction;
          }));
          setLoading(false);
        });
        return unsubscribeTransactions;
      } else {
        setWallet(null);
        setTransactions([]);
        setLoading(false);
      }
    });

    const projectsQuery = query(collection(db, 'projects'), where('members', 'array-contains', user.uid));
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });


    return () => {
      unsubscribeWallet();
      unsubscribeProjects();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PersonalWalletCard wallet={wallet} projects={projects} />
        </div>
        <div className="lg:col-span-2">
          <WalletTransactions transactions={transactions} wallet={wallet} />
        </div>
      </div>
    </div>
  );
}
