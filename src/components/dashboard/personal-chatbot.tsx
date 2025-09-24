'use client';

import { useState, useEffect, useRef } from 'react';
import { VaultItem, PersonalWallet, WalletTransaction, DiaryEntry, Task, Habit, HabitLog } from '@/lib/types';
import { CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Loader2, Bot, Paperclip, Mic, StopCircle, X, AudioLines, Trash2 } from 'lucide-react';
import { personalChat, PersonalChatInput } from '@/ai/flows/personal-chat-flow';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

interface PersonalChatbotProps {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  diaryEntries: DiaryEntry[];
  wallet: PersonalWallet | null;
  walletTransactions: WalletTransaction[];
  vaultItems: VaultItem[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: Timestamp | Date;
}

export function PersonalChatbot({
  tasks,
  habits,
  habitLogs,
  diaryEntries,
  wallet,
  walletTransactions,
  vaultItems,
}: PersonalChatbotProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const messagesCollectionRef = user ? collection(db, 'personalChats', user.uid, 'messages') : null;

  useEffect(() => {
    if (!messagesCollectionRef) return;
    const q = query(messagesCollectionRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [messagesCollectionRef]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!user || !messagesCollectionRef) {
        toast({ variant: 'destructive', title: 'Not authenticated'});
        return;
    }
    
    setIsLoading(true);

    const userMessageData = {
        sender: 'user' as const,
        text: input,
        userId: user.uid,
        createdAt: serverTimestamp(),
    };

    await addDoc(messagesCollectionRef, userMessageData);

    setInput('');
    
    try {
      const chatInput: PersonalChatInput = {
        userMessage: input,
        tasks,
        habits,
        habitLogs,
        diaryEntries,
        wallet: wallet || undefined,
        walletTransactions,
        vaultItems
      };

      const result = await personalChat(chatInput);

      const aiMessageData = {
        sender: 'ai' as const,
        text: result.response,
        createdAt: serverTimestamp(),
      };
      await addDoc(messagesCollectionRef, aiMessageData);

    } catch (error) {
      console.error('Personal chatbot error:', error);
      const errorMessageData = {
        sender: 'ai' as const,
        text: "Sorry, I encountered an error. Please try again.",
        createdAt: serverTimestamp(),
      };
      await addDoc(messagesCollectionRef, errorMessageData);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearHistory = async () => {
    if (!messagesCollectionRef) return;
    const batch = writeBatch(db);
    const snapshot = await getDocs(messagesCollectionRef);
    if (snapshot.empty) {
        toast({ description: "Chat history is already empty." });
        return;
    }
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    toast({ title: 'Success', description: 'Personal chat history has been cleared.' });
  }

  const getInitials = (nameOrEmail: string | null | undefined) => {
    if (!nameOrEmail) return 'U';
    const nameParts = nameOrEmail.split(' ');
    if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return nameOrEmail[0].toUpperCase();
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-10rem)]">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
            <CardTitle className="text-lg">Personal AI Assistant</CardTitle>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={messages.length === 0}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete your personal chat history. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory}>Clear History</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-4 gap-4">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                {message.sender === 'ai' && (
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-md rounded-xl px-4 py-3 text-sm ${ message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted' }`}>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
                 {message.sender === 'user' && (
                  <Avatar className="h-8 w-8">
                     <AvatarFallback>{getInitials(user?.profile?.name ?? user?.email)}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                 <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                <div className="max-w-md rounded-xl bg-muted px-4 py-3 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your day, tasks, habits..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </div>
  );
}
