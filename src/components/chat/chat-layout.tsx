
'use client';

import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import type { Chat, UserProfile } from '@/lib/types';
import { ChatSidebar } from './chat-sidebar';
import { ChatWindow } from './chat-window';
import { OnlineUsers } from './online-users';
import { Card } from '../ui/card';

export function ChatLayout() {
    const { user } = useAuth();
    const [chats, setChats] = useState<Chat[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        // Fetch all users for chat creation and info
        const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
            setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
        });

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
                
                // For direct chats, dynamically set title and photoURL of the other user
                if (chatData.type === 'direct') {
                    const otherMemberId = chatData.members.find(uid => uid !== user.uid);
                    const otherUser = allUsers.find(u => u.id === otherMemberId);
                    return {
                        id: chatId,
                        ...chatData,
                        title: otherUser?.name || otherUser?.email,
                        photoURL: otherUser?.photoURL,
                    }
                }

                // For project chats, we could fetch project details if needed
                return { id: chatId, ...chatData, title: chatData.projectId || 'Project Chat' };

            }) as Chat[];
            setChats(userChats);
        });

        return () => {
            usersUnsub();
            chatsUnsub();
        };
    }, [user, allUsers]); // Rerun when allUsers is populated

    const activeChat = chats.find(c => c.id === activeChatId) || null;

    if (!user) return null;

    return (
        <Card className="h-[calc(100vh-8rem)] w-full grid grid-cols-[300px_1fr_250px]">
            <ChatSidebar
                chats={chats}
                activeChatId={activeChatId}
                onSelectChat={setActiveChatId}
                allUsers={allUsers.filter(u => u.id !== user.uid)}
            />
            
            {activeChat ? (
                <ChatWindow chat={activeChat} allUsers={allUsers} />
            ) : (
                <div className="flex flex-col items-center justify-center h-full border-x">
                    <p className="text-muted-foreground">Select a chat to start messaging</p>
                </div>
            )}

            <OnlineUsers />
        </Card>
    );
}
