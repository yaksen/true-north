
'use client';

import { useAuth } from '@/hooks/use-auth';
import type { Chat, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
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

function CreateChatDialog({ users, onChatCreated }: { users: UserProfile[], onChatCreated: (chatId: string) => void }) {
    const { user } = useAuth();
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const handleCreateChat = async () => {
        if (!user || !selectedUserId) return;

        const members = [user.uid, selectedUserId].sort();
        
        // A more robust way to create a deterministic ID
        const chatId = members.join('_');
        
        // Check if chat already exists
        const q = query(collection(db, 'chats'), where('members', '==', members));
        const existingChats = await getDocs(q);
        
        if (existingChats.empty) {
            // Note: We are not setting the document ID here, Firestore will auto-generate it.
            // A deterministic ID (like `chatId`) would require using setDoc on a doc ref.
            // For now, we'll let Firestore generate it to avoid conflicts with existing logic.
            const newChatRef = await addDoc(collection(db, 'chats'), {
                type: 'direct',
                members: members,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastMessage: {
                    text: 'Chat created.',
                    senderId: '',
                    timestamp: serverTimestamp()
                }
            });
            onChatCreated(newChatRef.id);
        } else {
            onChatCreated(existingChats.docs[0].id);
        }
    };
    
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Chat
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a new chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p>Select a user to start a conversation with:</p>
                    <div className="max-h-64 overflow-y-auto">
                        {users.map(u => (
                            <div
                                key={u.id}
                                onClick={() => setSelectedUserId(u.id)}
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer",
                                    selectedUserId === u.id && 'bg-muted'
                                )}
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={u.photoURL} />
                                    <AvatarFallback>{getInitials(u.name, u.email)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{u.name || u.email}</p>
                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button onClick={handleCreateChat} disabled={!selectedUserId}>
                        Start Chat
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function ChatSidebar({ chats, activeChatId, onSelectChat, allUsers }: ChatSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    try {
        await deleteDoc(doc(db, 'chats', chatId));
        toast({ title: 'Chat Deleted', description: 'The conversation has been removed.'});
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete chat.'});
    }
  };

  if (!user) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Chats</h2>
        <CreateChatDialog users={allUsers} onChatCreated={onSelectChat} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={cn(
              'group p-4 flex items-center gap-3 cursor-pointer border-b relative',
              activeChatId === chat.id ? 'bg-muted' : 'hover:bg-muted/50'
            )}
            onClick={() => onSelectChat(chat.id)}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={chat.photoURL} />
              <AvatarFallback>{getInitials(chat.title)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <p className="font-semibold truncate">{chat.title}</p>
                <p className="text-xs text-muted-foreground">
                  {chat.lastMessage?.timestamp && formatDistanceToNow(chat.lastMessage.timestamp.toDate(), { addSuffix: true })}
                </p>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {chat.lastMessage?.senderId === user.uid && 'You: '}
                {chat.lastMessage?.text}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()} // Prevent triggering parent onClick
                >
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this chat. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={(e) => handleDeleteChat(e, chat.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}
