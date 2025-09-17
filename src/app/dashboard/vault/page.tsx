
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { VaultFolder, VaultItem } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { VaultClient } from '@/components/vault/vault-client';

export default function VaultPage() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const foldersQuery = query(collection(db, 'vaultFolders'), where('userId', '==', user.uid));
    const itemsQuery = query(collection(db, 'vaultItems'), where('userId', '==', user.uid));

    const unsubscribeFolders = onSnapshot(foldersQuery, (snapshot) => {
      setFolders(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as VaultFolder;
      }));
    });

    const unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
      setItems(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as VaultItem;
      }));
      setLoading(false);
    });

    return () => {
      unsubscribeFolders();
      unsubscribeItems();
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
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Personal Vault</h1>
      </div>
      <VaultClient folders={folders} items={items} />
    </>
  );
}
