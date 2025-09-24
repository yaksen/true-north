'use client';

import { useState, useEffect, useRef } from 'react';
import { Project, Task, Finance, Lead, Channel, Vendor, Partner, Service, Product, Package, Invoice, Note } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Loader2, Bot, Paperclip, Mic, StopCircle, X, AudioLines } from 'lucide-react';
import { projectChat, ProjectChatInput } from '@/ai/flows/project-chat-flow';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface ProjectChatbotProps {
  project: Project;
  tasks: Task[];
  finances: Finance[];
  leads: Lead[];
  channels: Channel[];
  vendors: Vendor[];
  partners: Partner[];
  services: Service[];
  products: Product[];
  packages: Package[];
  invoices: Invoice[];
  notes: Note[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  image?: string;
  audio?: string;
  createdAt: Timestamp | Date;
}

export function ProjectChatbot({
  project,
  tasks,
  finances,
  leads,
  channels,
  vendors,
  partners,
  services,
  products,
  packages,
  invoices,
  notes,
}: ProjectChatbotProps) {
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

  useEffect(() => {
    const q = query(
      collection(db, 'projectChats', project.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [project.id]);

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
    if (!user) {
        toast({ variant: 'destructive', title: 'Not authenticated'});
        return;
    }
    
    setIsLoading(true);

    const imageDataUri = imageFile ? await fileToDataUri(imageFile) : undefined;
    const audioDataUri = audioBlob ? await fileToDataUri(audioBlob) : undefined;

    const userMessageData = {
        sender: 'user' as const,
        text: input,
        userId: user.uid,
        createdAt: serverTimestamp(),
        image: imageDataUri,
        audio: audioDataUri,
    };

    // Save user message to Firestore
    const messagesCollection = collection(db, 'projectChats', project.id, 'messages');
    await addDoc(messagesCollection, userMessageData);

    setInput('');
    clearMedia();
    
    try {
      const chatInput: ProjectChatInput = {
        userMessage: input,
        imageDataUri,
        audioDataUri,
        project, tasks, finances, leads, channels, vendors, partners, services, products, packages, invoices, notes,
      };

      const result = await projectChat(chatInput);

      const aiMessageData = {
        sender: 'ai' as const,
        text: result.response,
        createdAt: serverTimestamp(),
      };
      await addDoc(messagesCollection, aiMessageData);

    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessageData = {
        sender: 'ai' as const,
        text: "Sorry, I encountered an error. Please try again.",
        createdAt: serverTimestamp(),
      };
      await addDoc(messagesCollection, errorMessageData);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (nameOrEmail: string | null | undefined) => {
    if (!nameOrEmail) return 'U';
    const nameParts = nameOrEmail.split(' ');
    if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return nameOrEmail[0].toUpperCase();
  }

  return (
    <Card className="h-[calc(100vh-20rem)] flex flex-col">
      <CardContent className="flex-1 flex flex-col p-4">
        <ScrollArea className="flex-1 mb-4 pr-4" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                {message.sender === 'ai' && (
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                    <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-md rounded-xl px-4 py-3 text-sm ${ message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted' }`}>
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
            <div className="flex items-center gap-2 text-sm p-2 mb-2 bg-muted rounded-md">
                {imagePreview && <Image src={imagePreview} alt="Preview" width={40} height={40} className="rounded" />}
                {audioBlob && <audio src={URL.createObjectURL(audioBlob)} controls className='h-10'/>}
                <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={clearMedia}><X className="h-4 w-4" /></Button>
            </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />

            <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? <AudioLines className="h-4 w-4 text-red-500 animate-pulse" /> : <Mic className="h-4 w-4" />}
            </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about this project..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
