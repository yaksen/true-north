
'use client';

import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState, useRef } from 'react';
import type { Chat, UserProfile } from '@/lib/types';
import { ChatSidebar } from './chat-sidebar';
import { ChatWindow } from './chat-window';
import { Card } from '../ui/card';

export function ChatLayout() {
    const { user } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const allUsersRef = useRef<UserProfile[]>([]);


    useEffect(() => {
        if (!user) return;

        // Fetch all users once and store in ref to avoid re-running chat listener
        const fetchAllUsers = async () => {
             const usersSnapshot = await getDocs(collection(db, 'users'));
             const usersData = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
             allUsersRef.current = usersData;
             setAllUsers(usersData);
        }
        fetchAllUsers();

        // Fetch user's chats
        const chatsQuery = query(
            collection(db, 'chats'),
            where('members', 'array-contains', user.uid),
            orderBy('updatedAt', 'desc')
        );

        const chatsUnsub = onSnapshot(chatsQuery, (snapshot) => {
            const userChats = snapshot.docs.map(doc => {
                const chatData = doc.data() as Omit<Chat, 'id'>;
                const chatId = doc.id;
                
                if (chatData.type === 'direct') {
                    const otherMemberId = chatData.members.find(uid => uid !== user.uid);
                    const otherUser = allUsersRef.current.find(u => u.id === otherMemberId);
                    return {
                        id: chatId,
                        ...chatData,
                        title: otherUser?.name || otherUser?.email,
                        photoURL: otherUser?.photoURL,
                    }
                }

                return { id: chatId, ...chatData, title: chatData.projectId || 'Project Chat' };

            }) as Chat[];
            setChats(userChats);
        });

        return () => {
            chatsUnsub();
        };
    }, [user]);

    const activeChat = chats.find(c => c.id === activeChatId) || null;

    if (!user) return null;

    return (
        <Card className="h-[calc(100vh-8rem)] w-full grid grid-cols-[300px_1fr]">
            <ChatSidebar
                chats={chats}
                activeChatId={activeChatId}
                onSelectChat={setActiveChatId}
                allUsers={allUsers.filter(u => u.id !== user.uid)}
            />
            
            {activeChat ? (
                <ChatWindow chat={activeChat} allUsers={allUsers} />
            ) : (
                <div className="flex flex-col items-center justify-center h-full border-l">
                    <p className="text-muted-foreground">Select a chat to start messaging</p>
                </div>
            )}
        </Card>
    );
}
