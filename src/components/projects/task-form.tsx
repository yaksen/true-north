

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Task, Project, Lead, ProjectMember, TaskStatus, Channel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Sparkles, ImageIcon, Mic, StopCircle } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format, addDays, parseISO } from 'date-fns';
import { logActivity } from '@/lib/activity-log';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { extractTaskDetails, type ExtractTaskDetailsOutput } from '@/ai/flows/extract-task-details-flow';
import Image from 'next/image';

const slots = ['morning', 'midday', 'night'] as const;
const quickActions: TaskStatus[] = ['Call', 'Meeting', 'Project', 'Order', 'Deliver', 'Follow-up'];

const formSchema = z.object({
  projectId: z.string().nonempty({ message: 'Project is required.' }),
  parentTaskId: z.string().optional(),
  leadId: z.string().optional(),
  channelId: z.string().optional(),
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  description: z.string().optional(),
  slot: z.enum(slots),
  dueDate: z.date().optional(),
  assigneeUid: z.string().optional(),
});

type TaskFormValues = z.infer<typeof formSchema>;

interface TaskFormProps {
  task?: Task;
  projectId?: string;
  parentTaskId?: string;
  leadId?: string;
  channelId?: string;
  projects?: Project[];
  leads?: Lead[];
  channels?: Channel[];
  members?: ProjectMember[];
  closeForm: () => void;
}

export function TaskForm({ task, projectId, parentTaskId, leadId, channelId, projects, leads, channels, members, closeForm }: TaskFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImage, setAiImage] = useState<File | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: task ? {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    } : {
      projectId: projectId || '',
      parentTaskId: parentTaskId || '',
      leadId: leadId || '',
      channelId: channelId || '',
      title: '',
      description: '',
      slot: 'morning',
      dueDate: new Date(),
      assigneeUid: user?.uid || '',
    },
  });

  const selectedProjectId = form.watch('projectId');

  const filteredLeads = useMemo(() => {
    if (!selectedProjectId || !leads) {
      return [];
    }
    return leads.filter(lead => lead.projectId === selectedProjectId);
  }, [selectedProjectId, leads]);
  
  useEffect(() => {
    // Reset lead selection when project changes
    form.setValue('leadId', '');
    form.setValue('channelId', '');
  }, [selectedProjectId, form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setAiImage(event.target.files[0]);
      const reader = new FileReader();
      reader.onload = (e) => setPastedImage(e.target?.result as string);
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                setAiImage(blob);
                const reader = new FileReader();
                reader.onload = (e) => setPastedImage(e.target?.result as string);
                reader.readAsDataURL(blob);
            }
        }
    }
  };
  
  const fileToDataUri = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = event => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            setAudioBlob(audioBlob);
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
    } catch (error) {
        console.error("Error accessing microphone:", error);
        toast({ variant: 'destructive', title: 'Microphone Error', description: 'Could not access the microphone.' });
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleExtractDetails = async () => {
    if (!aiPrompt && !aiImage && !audioBlob) {
        toast({
            variant: 'destructive',
            title: 'No Input Provided',
            description: 'Please provide some text, an image, or a recording for the AI to process.'
        });
        return;
    }

    setIsExtracting(true);
    try {
        const imageDataUri = aiImage ? await fileToDataUri(aiImage) : undefined;
        // @ts-ignore
        const audioDataUri = audioBlob ? await fileToDataUri(audioBlob) : undefined;
        
        const extractedData: ExtractTaskDetailsOutput = await extractTaskDetails({
            prompt: aiPrompt,
            imageDataUri: imageDataUri,
            // @ts-ignore
            audioDataUri: audioDataUri,
        });

        if (extractedData.title) form.setValue('title', extractedData.title);
        if (extractedData.description) form.setValue('description', extractedData.description);
        if (extractedData.dueDate) form.setValue('dueDate', parseISO(extractedData.dueDate));
        if (extractedData.assigneeName) {
            const assignee = members?.find(m => m.displayName.toLowerCase().includes(extractedData.assigneeName!.toLowerCase()));
            if (assignee) {
                form.setValue('assigneeUid', assignee.uid);
            }
        }
        
        toast({
            title: 'Details Extracted',
            description: 'The AI has filled the form with the extracted details. Please review them.'
        });

    } catch (error) {
        console.error('Error extracting task details:', error);
        toast({
            variant: 'destructive',
            title: 'Extraction Failed',
            description: 'The AI could not extract details. Please try again.'
        });
    } finally {
        setIsExtracting(false);
    }
  };

  async function onSubmit(values: TaskFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const finalProjectId = values.projectId;

      if (task) {
        const taskRef = doc(db, 'tasks', task.id);
        await updateDoc(taskRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(finalProjectId, 'task_updated', { title: values.title }, user.uid);
        toast({ title: 'Success', description: 'Task updated successfully.' });
      } else {
        const taskData: any = {
          ...values,
          completed: false, // New tasks are not completed by default
          assigneeUid: values.assigneeUid || user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'tasks'), taskData);
        await logActivity(finalProjectId, 'task_created', { title: values.title }, user.uid);
        toast({ title: 'Success', description: 'Task created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting task form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {projects && (
            <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a project..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            )}
            <div className='grid grid-cols-2 gap-4'>
                <FormField
                    control={form.control}
                    name="leadId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Lead (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProjectId}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assign to a lead..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {filteredLeads.map(l => (
                                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="channelId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Channel (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProjectId}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assign to a channel..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {channels?.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className='grid grid-cols-2 gap-4'>
                <FormField
                    control={form.control}
                    name="assigneeUid"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Assignee</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select an assignee..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {members?.map(m => (
                                        <SelectItem key={m.uid} value={m.uid}>{m.displayName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Due Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(new Date(field.value), "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date("1900-01-01")}
                                    initialFocus
                                />
                                <div className="p-2 border-t flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => field.onChange(new Date())}>Today</Button>
                                    <Button size="sm" variant="ghost" onClick={() => field.onChange(addDays(new Date(), 1))}>Tomorrow</Button>
                                    <Button size="sm" variant="ghost" onClick={() => field.onChange(addDays(new Date(), 2))}>Day After</Button>
                                </div>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Design the new logo" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormItem>
                    <FormLabel>Quick Action</FormLabel>
                    <Select onValueChange={(value) => form.setValue('title', value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                            {quickActions.map(action => (
                                <SelectItem key={action} value={action}>{action}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormItem>
            </div>
            <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                    <Textarea placeholder="A brief description of the task..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="slot"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Slot</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            {slots.map(slot => (
                                <SelectItem key={slot} value={slot} className="capitalize">{slot}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            
            <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {task ? 'Update' : 'Create'} Task
            </Button>
            </div>
        </form>
        </Form>
        <Card className='h-fit'>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    <Sparkles className='h-5 w-5 text-primary' />
                    AI Assistant
                </CardTitle>
                <CardDescription>
                    Paste text or upload an image to automatically fill the form.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="ai-prompt">Text or Prompt</Label>
                    <Textarea
                        id="ai-prompt"
                        placeholder="e.g., 'Remind Alex to call the new client tomorrow morning'"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="h-24"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Image (e.g., Screenshot)</Label>
                    <div onPaste={handlePaste} className="relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary">
                        {pastedImage ? (
                            <Image src={pastedImage} alt="Pasted preview" layout="fill" objectFit="contain" className='rounded-lg' />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <ImageIcon className='mx-auto h-8 w-8' />
                                <p>Click to upload or paste an image</p>
                            </div>
                        )}
                        <Input id="ai-image" type="file" accept="image/*" onChange={handleFileChange} className='absolute inset-0 w-full h-full opacity-0 cursor-pointer' />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Voice Note</Label>
                    <div className='flex items-center gap-2'>
                        <Button type='button' onClick={isRecording ? stopRecording : startRecording} variant={isRecording ? 'destructive' : 'outline'} size='icon'>
                           {isRecording ? <StopCircle /> : <Mic />}
                        </Button>
                        {audioBlob && (
                            <audio src={URL.createObjectURL(audioBlob)} controls className='w-full h-10'/>
                        )}
                        {isRecording && <p className='text-sm text-muted-foreground animate-pulse'>Recording...</p>}
                    </div>
                </div>
                <Button className='w-full' onClick={handleExtractDetails} disabled={isExtracting}>
                    {isExtracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Extract Details
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
