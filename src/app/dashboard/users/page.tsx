
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { UserProfile } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { getColumns } from '@/components/users/columns';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.profile?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setLoading(true);
    const q = query(collection(db, `users`));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({ 
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        } as UserProfile);
      });
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, router]);

  if (user?.profile?.role !== 'admin') {
    return (
        <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  const columns = getColumns({ setUsers });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">User Management</h1>
      </div>
      <DataTable columns={columns} data={users} filterColumn="email" filterColumnName="Email" />
    </>
  );
}
