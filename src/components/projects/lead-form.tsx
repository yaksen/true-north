'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Lead, Channel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, PlusCircle, Trash2, Sparkles, Image as ImageIcon, Mic, StopCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { logActivity } from '@/lib/activity-log';
import { v4 as uuidv4 } from 'uuid';
import { extractLeadDetails, type ExtractLeadDetailsOutput } from '@/ai/flows/extract-lead-details-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const leadStatuses = ['new', 'contacted', 'qualified', 'lost', 'converted'] as const;
const socialPlatforms = ['LinkedIn', 'Twitter', 'GitHub', 'Facebook', 'Instagram', 'TikTok', 'Website'];


const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  socials: z.array(z.object({
    platform: z.string().min(1, 'Platform is required'),
    url: z.string().url('Must be a valid URL'),
  })).optional(),
  notes: z.string().optional(),
  status: z.enum(leadStatuses),
  channelId: z.string().optional(),
});

type LeadFormValues = z.infer<typeof formSchema>;

interface LeadFormProps {
  lead?: Lead;
  projectId: string;
  channels: Channel[];
  closeForm: () => void;
}

export function LeadForm({ lead, projectId, channels, closeForm }: LeadFormProps) {
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

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: lead ? {
        ...lead,
        email: lead.email || '',
        phone: lead.phone || '',
        notes: lead.notes || '',
        socials: lead.socials || [],
        channelId: lead.channelId || '',
    } : {
      name: '',
      sku: `LEAD-${uuidv4().substring(0, 8).toUpperCase()}`,
      email: '',
      phone: '',
      socials: [],
      notes: '',
      status: 'new',
      channelId: channels.length > 0 ? channels[channels.length - 1].id : '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "socials",
  });

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
        const audioDataUri = audioBlob ? await fileToDataUri(audioBlob) : undefined;
        
        const extractedData: ExtractLeadDetailsOutput = await extractLeadDetails({
            prompt: aiPrompt,
            imageDataUri: imageDataUri,
            audioDataUri: audioDataUri,
        });

        if (extractedData.name) form.setValue('name', extractedData.name);
        if (extractedData.email) form.setValue('email', extractedData.email);
        if (extractedData.phone) form.setValue('phone', extractedData.phone);
        if (extractedData.notes) form.setValue('notes', extractedData.notes);
        if (extractedData.socials) {
            // Replace existing socials with extracted ones
            form.setValue('socials', extractedData.socials);
        }

        toast({
            title: 'Details Extracted',
            description: 'The AI has filled the form with the extracted details. Please review them.'
        });

    } catch (error) {
        console.error('Error extracting lead details:', error);
        toast({
            variant: 'destructive',
            title: 'Extraction Failed',
            description: 'The AI could not extract details. Please try again.'
        });
    } finally {
        setIsExtracting(false);
    }
};

  async function onSubmit(data: LeadFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    const values = {
      ...data,
      channelId: data.channelId === 'none' ? '' : data.channelId,
    };

    try {
      if (lead) {
        const leadRef = doc(db, 'leads', lead.id);
        await updateDoc(leadRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(projectId, 'lead_updated', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Lead updated successfully.' });
      } else {
        await addDoc(collection(db, 'leads'), {
          ...values,
          projectId: projectId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(projectId, 'lead_created', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Lead created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting lead form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <div className='space-y-4'>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <FormControl>
                                <Input placeholder="Auto-generated SKU" {...field} readOnly />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                    <Input placeholder="+1 234 567 890" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div>
                    <FormLabel>Social Links</FormLabel>
                    <div className="space-y-2 mt-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                                <FormField
                                    control={form.control}
                                    name={`socials.${index}.platform`}
                                    render={({ field }) => (
                                        <FormItem className="w-1/3">
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Platform" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {socialPlatforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`socials.${index}.url`}
                                    render={({ field }) => (
                                        <Input {...field} placeholder="URL" className="flex-1"/>
                                    )}
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ platform: 'Website', url: '' })}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Social Link
                        </Button>
                    </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {leadStatuses.map(status => (
                                        <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
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
                            <FormLabel>From</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a channel..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {channels.map(channel => (
                                        <SelectItem key={channel.id} value={channel.id}>{channel.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Initial notes about the lead..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {lead ? 'Update' : 'Create'} Lead
                </Button>
                </div>
            </form>
            </Form>
        </div>

        <Card className='h-fit'>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    <Sparkles className='h-5 w-5 text-primary' />
                    AI Assistant
                </CardTitle>
                <CardDescription>
                    Use text, an image, or a voice note to automatically fill the form.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="ai-prompt">Text or Prompt</Label>
                    <Textarea
                        id="ai-prompt"
                        placeholder="Paste an email signature, notes from a meeting, or details about a lead..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="h-24"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Image (e.g., Business Card)</Label>
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
