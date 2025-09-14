
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from './ui/button';
import { Bell } from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import Link from 'next/link';
// import { notificationDetails } from './projects/activity-timeline';

export function NotificationsPopover() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const notifsQuery = query(
      collection(db, 'notifications', user.uid, 'inbox'),
      orderBy('createdAt', 'desc'),
      limit(10) // Fetch latest 10
    );

    const unsubscribe = onSnapshot(notifsQuery, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      const unread = notifs.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user]);

  const handleOpenChange = async (open: boolean) => {
    if (open && unreadCount > 0 && user) {
        // Mark notifications as read
        const batch = writeBatch(db);
        notifications.forEach(notif => {
            if (!notif.isRead) {
                const notifRef = doc(db, 'notifications', user.uid, 'inbox', notif.id);
                batch.update(notifRef, { isRead: true });
            }
        });
        await batch.commit();
    }
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground">
                {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Card>
            <CardHeader>
                <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className='max-h-96 overflow-y-auto'>
                {notifications.length > 0 ? (
                    <div className='space-y-4'>
                        {notifications.map(n => (
                            <div key={n.id} className='flex gap-3'>
                                <Avatar className='h-8 w-8 mt-1'>
                                    <AvatarFallback>
                                        {/* <Icon className="h-4 w-4"/> */}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className='font-semibold text-sm'>{n.title}</p>
                                    <p className='text-sm text-muted-foreground'>{n.body}</p>
                                    <p className='text-xs text-muted-foreground mt-1'>
                                        {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ): (
                    <p className='text-center text-sm text-muted-foreground py-8'>No new notifications</p>
                )}
            </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
