
'use client';

import { useState, useEffect, useRef } from 'react';
import { VaultItem, PersonalWallet, WalletTransaction, DiaryEntry, Task, Habit, HabitLog, PersonalExpense } from '@/lib/types';
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
import Image from 'next/image';

interface PersonalChatbotProps {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  diaryEntries: DiaryEntry[];
  wallet: PersonalWallet | null;
  walletTransactions: WalletTransaction[];
  vaultItems: VaultItem[];
  personalExpenses: PersonalExpense[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  image?: string;
  audio?: string;
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
  personalExpenses,
}: PersonalChatbotProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const fileToDataUri = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
    } else {
        toast({ variant: 'destructive', title: 'Unsupported File', description: 'Please upload an image file.' });
    }
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = event => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setAudioBlob(blob);
            audioChunksRef.current = [];
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setAudioBlob(null);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Microphone Error', description: 'Could not access the microphone.' });
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };
  
  const clearMedia = () => {
    setImageFile(null);
    setImagePreview(null);
    setAudioBlob(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageFile && !audioBlob) return;
    if (!user || !messagesCollectionRef) {
        toast({ variant: 'destructive', title: 'Not authenticated'});
        return;
    }
    
    setIsLoading(true);

    const imageDataUri = imageFile ? await fileToDataUri(imageFile) : undefined;
    const audioDataUri = audioBlob ? await fileToDataUri(audioBlob) : undefined;

    const userMessageData: any = {
        sender: 'user' as const,
        text: input,
        userId: user.uid,
        createdAt: serverTimestamp(),
    };
    if (imageDataUri) userMessageData.image = imageDataUri;
    if (audioDataUri) userMessageData.audio = audioDataUri;

    await addDoc(messagesCollectionRef, userMessageData);

    setInput('');
    clearMedia();
    
    try {
      const chatInput: PersonalChatInput = {
        userMessage: input,
        imageDataUri: imageDataUri,
        audioDataUri: audioDataUri,
        tasks,
        habits,
        habitLogs,
        diaryEntries,
        wallet: wallet || undefined,
        walletTransactions,
        vaultItems,
        personalExpenses,
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
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
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
        <CardContent className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                {message.sender === 'ai' && (
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                )}
                <div className={`prose dark:prose-invert prose-sm max-w-md rounded-xl px-4 py-3 text-sm ${ message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted' }`}>
                  {message.image && <Image src={message.image} alt="user upload" width={200} height={200} className='rounded-md mb-2' />}
                  {message.audio && <audio src={message.audio} controls className='w-full h-10 mb-2' />}
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
        
        {(imagePreview || audioBlob) && (
            <div className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
                {imagePreview && <Image src={imagePreview} alt="Preview" width={40} height={40} className="rounded" />}
                {audioBlob && <audio src={URL.createObjectURL(audioBlob)} controls className='h-10'/>}
                <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={clearMedia}><X className="h-4 w-4" /></Button>
            </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
           <Button type="button" size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />

            <Button type="button" size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? <AudioLines className="h-4 w-4 text-red-500 animate-pulse" /> : <Mic className="h-4 w-4" />}
            </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your day, tasks, habits..."
            disabled={isLoading}
            className="h-9"
          />
          <Button type="submit" disabled={isLoading} size="icon" className="h-9 w-9 flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </div>
  );
}

    
