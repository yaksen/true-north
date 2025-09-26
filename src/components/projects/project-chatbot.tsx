
'use client';

import { useState, useEffect, useRef } from 'react';
import { Project, Task, Finance, Lead, Channel, Vendor, Partner, Service, Product, Package, Invoice, Note } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Send, Loader2, Bot, Paperclip, Mic, StopCircle, X, AudioLines, Trash2, Expand } from 'lucide-react';
import { projectChat, ProjectChatInput } from '@/ai/flows/project-chat-flow';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Dialog, DialogContent } from '../ui/dialog';

interface ChatMessageProps {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  image?: string;
  audio?: string;
  createdAt: Timestamp | Date;
}

const getInitials = (nameOrEmail: string | null | undefined) => {
    if (!nameOrEmail) return 'U';
    const nameParts = nameOrEmail.split(' ');
    if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return nameOrEmail[0].toUpperCase();
};

const BotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
        <path d="M352 64C352 46.3 337.7 32 320 32C302.3 32 288 46.3 288 64L288 128L192 128C139 128 96 171 96 224L96 448C96 501 139 544 192 544L448 544C501 544 544 501 544 448L544 224C544 171 501 128 448 128L352 128L352 64zM160 432C160 418.7 170.7 408 184 408L216 408C229.3 408 240 418.7 240 432C240 445.3 229.3 456 216 456L184 456C170.7 456 160 445.3 160 432zM280 432C280 418.7 290.7 408 304 408L336 408C349.3 408 360 418.7 360 432C360 445.3 349.3 456 336 456L304 456C290.7 456 280 445.3 280 432zM400 432C400 418.7 410.7 408 424 408L456 408C469.3 408 480 418.7 480 432C480 445.3 469.3 456 456 456L424 456C410.7 456 400 445.3 400 432zM224 240C250.5 240 272 261.5 272 288C272 314.5 250.5 336 224 336C197.5 336 176 314.5 176 288C176 261.5 197.5 240 224 240zM368 288C368 261.5 389.5 240 416 240C442.5 240 464 261.5 464 288C464 314.5 442.5 336 416 336C389.5 336 368 314.5 368 288zM64 288C64 270.3 49.7 256 32 256C14.3 256 0 270.3 0 288L0 384C0 401.7 14.3 416 32 416C49.7 416 64 401.7 64 384L64 288zM608 256C590.3 256 576 270.3 576 288L576 384C576 401.7 590.3 416 608 416C625.7 416 640 401.7 640 384L640 288C640 270.3 625.7 256 608 256z"/>
    </svg>
);


const ChatMessage: React.FC<{ message: ChatMessageProps, user: any }> = ({ message, user }) => {
    const isUser = message.sender === 'user';
    return (
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && (
                <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center">
                    <BotIcon />
                </Avatar>
            )}
            <div className={`flex flex-col gap-1.5 rounded-xl px-4 py-3 text-sm ${ isUser ? 'bg-primary text-primary-foreground' : 'bg-muted' }`}>
                {message.image && <Image src={message.image} alt="user upload" width={200} height={200} className='rounded-md mb-2' />}
                {message.audio && <audio src={message.audio} controls className='w-full h-10 mb-2' />}
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: message.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>').replace(/`([^`]+)`/g, '<code>$1</code>') }} />
            </div>
            {isUser && (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.profile?.photoURL ?? undefined} alt={user?.profile?.name ?? ''} />
                    <AvatarFallback>{getInitials(user?.profile?.name ?? user?.email)}</AvatarFallback>
                </Avatar>
            )}
        </div>
    );
};


const ChatInterface = ({
    project, tasks, finances, leads, channels, vendors, partners, services, products, packages, invoices, notes, isFullscreen = false 
}: ProjectChatbotProps & { isFullscreen?: boolean }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<ChatMessageProps[]>([]);
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
    
    const messagesCollectionRef = collection(db, 'projectChats', project.id, 'messages');
  
    useEffect(() => {
      const q = query(messagesCollectionRef, orderBy('createdAt', 'asc'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const msgs: ChatMessageProps[] = [];
        querySnapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() } as ChatMessageProps);
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
        const chatInput: ProjectChatInput = {
          userMessage: input,
          imageDataUri: imageDataUri,
          audioDataUri: audioDataUri,
          project, tasks, finances, leads, channels, vendors, partners, services, products, packages, invoices, notes,
        };
  
        const result = await projectChat(chatInput);
  
        const aiMessageData = {
          sender: 'ai' as const,
          text: result.response,
          createdAt: serverTimestamp(),
        };
        await addDoc(messagesCollectionRef, aiMessageData);
  
      } catch (error) {
        console.error('Chatbot error:', error);
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
  
    return (
      <CardContent className="flex flex-col flex-1 p-4 gap-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.map((message) => (
                 <ChatMessage key={message.id} message={message} user={user} />
              ))}
              {isLoading && (
                <div className="flex items-start gap-3">
                   <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center">
                        <BotIcon />
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
              placeholder="Ask anything about this project..."
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
      </CardContent>
    );
}

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

export function ProjectChatbot(props: ProjectChatbotProps) {
    const { toast } = useToast();
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleClearHistory = async () => {
        const messagesCollectionRef = collection(db, 'projectChats', props.project.id, 'messages');
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
        toast({ title: 'Success', description: 'Chat history has been cleared.' });
      }

    return (
        <div className="flex flex-col flex-1">
            <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
                <CardTitle className="text-lg">TrueNorth AI</CardTitle>
                <div className='flex items-center'>
                    <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(true)}>
                        <Expand className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete the entire chat history for this project. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearHistory}>Clear History</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardHeader>
            <ChatInterface {...props} />

            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
                     <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
                        <CardTitle className="text-lg">TrueNorth AI</CardTitle>
                    </CardHeader>
                    <ChatInterface {...props} isFullscreen={true} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
