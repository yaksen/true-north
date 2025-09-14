
'use client';

import { useAuth } from '@/hooks/use-auth';
import type { Chat, Message, UserProfile } from '@/lib/types';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { MessageInput } from './message-input';

interface ChatWindowProps {
  chat: Chat;
  allUsers: UserProfile[];
}

function getInitials(name?: string, email?: string) {
    if (name) {
      const nameParts = name.split(' ');
      if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    return email ? email.substring(0, 2).toUpperCase() : 'U';
}


export function ChatWindow({ chat, allUsers }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'chats', chat.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });

    return () => unsubscribe();
  }, [chat.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  if (!user) return null;

  return (
    <div className="flex flex-col h-full border-x">
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar className="h-10 w-10">
            <AvatarImage src={chat.photoURL} />
            <AvatarFallback>{getInitials(chat.title)}</AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-lg">{chat.title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
            const sender = allUsers.find(u => u.id === message.senderId);
            const isMe = message.senderId === user.uid;
            return (
                <div
                    key={message.id}
                    className={cn(
                        'flex items-end gap-2',
                        isMe ? 'justify-end' : 'justify-start'
                    )}
                >
                    {!isMe && (
                         <Avatar className="h-8 w-8">
                            <AvatarImage src={sender?.photoURL} />
                            <AvatarFallback>{getInitials(sender?.name, sender?.email)}</AvatarFallback>
                        </Avatar>
                    )}
                    <div
                        className={cn(
                            'p-3 rounded-2xl max-w-sm',
                            isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}
                    >
                        <p>{message.text}</p>
                    </div>
                </div>
            )
        })}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput chatId={chat.id} />
    </div>
  );
}
