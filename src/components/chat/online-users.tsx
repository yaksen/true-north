
'use client';

import { db } from '@/lib/firebase';
import { Presence, UserProfile } from '@/lib/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

function getInitials(name?: string, email?: string) {
    if (name) {
      const nameParts = name.split(' ');
      if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'U';
}

export function OnlineUsers() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    // 1. Listen for presence changes
    const presenceQuery = query(collection(db, 'presence'), where('online', '==', true));
    const unsubPresence = onSnapshot(presenceQuery, async (snapshot) => {
        const onlineUserIds = snapshot.docs.map(doc => doc.id);

        if (onlineUserIds.length === 0) {
            setOnlineUsers([]);
            return;
        }

        // 2. Fetch profiles for online users
        const usersQuery = query(collection(db, 'users'), where('id', 'in', onlineUserIds));
        const usersSnapshot = await onSnapshot(usersQuery, (usersSnap) => {
            const profiles = usersSnap.docs.map(doc => doc.data() as UserProfile);
            setOnlineUsers(profiles.filter(p => p.id !== user?.uid)); // Exclude self
        });
    });

    return () => unsubPresence();
  }, [user?.uid]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Online</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {onlineUsers.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg">
                <div className='relative'>
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={u.photoURL} />
                        <AvatarFallback>{getInitials(u.name, u.email)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                </div>
                <div>
                    <p className="font-semibold text-sm">{u.name || u.email}</p>
                </div>
            </div>
        ))}
        {onlineUsers.length === 0 && (
            <p className='p-4 text-center text-sm text-muted-foreground'>No other users online.</p>
        )}
      </div>
    </div>
  );
}
