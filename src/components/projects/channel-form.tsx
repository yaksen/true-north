
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Channel, ChannelType } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { logActivity } from '@/lib/activity-log';
import { v4 as uuidv4 } from 'uuid';
import { extractChannelDetails, type ExtractChannelDetailsOutput } from '@/ai/flows/extract-channel-details-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import Image from 'next/image';

const channelStatuses = ['new', 'active', 'inactive', 'closed'] as const;
const channelTypes = ['Social', 'Communication', 'Community', 'Money / Business', 'Learning', 'Entertainment', 'Tech / Tools', 'Inspirations', 'Other'] as const;


const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  type: z.enum(channelTypes),
  url: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  status: z.enum(channelStatuses),
});

type ChannelFormValues = z.infer<typeof formSchema>;

interface ChannelFormProps {
  channel?: Channel;
  projectId: string;
  closeForm: () => void;
}

export function ChannelForm({ channel, projectId, closeForm }: ChannelFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImage, setAiImage] = useState<File | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);

  const form = useForm<ChannelFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: channel ? {
        ...channel,
        url: channel.url || '',
        notes: channel.notes || '',
    } : {
      name: '',
      sku: `CHAN-${uuidv4().substring(0, 8).toUpperCase()}`,
      type: 'Other',
      url: '',
      notes: '',
      status: 'new',
    },
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

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleExtractDetails = async () => {
    if (!aiPrompt && !aiImage) {
        toast({
            variant: 'destructive',
            title: 'No Input Provided',
            description: 'Please provide some text or an image for the AI to process.'
        });
        return;
    }

    setIsExtracting(true);
    try {
        const imageDataUri = aiImage ? await fileToDataUri(aiImage) : undefined;
        
        const extractedData: ExtractChannelDetailsOutput = await extractChannelDetails({
            prompt: aiPrompt,
            imageDataUri: imageDataUri
        });

        if (extractedData.name) form.setValue('name', extractedData.name);
        if (extractedData.type && channelTypes.includes(extractedData.type)) {
          form.setValue('type', extractedData.type);
        }
        if (extractedData.url) form.setValue('url', extractedData.url);

        toast({
            title: 'Details Extracted',
            description: 'The AI has filled the form with the extracted details. Please review them.'
        });

    } catch (error) {
        console.error('Error extracting channel details:', error);
        toast({
            variant: 'destructive',
            title: 'Extraction Failed',
            description: 'The AI could not extract details. Please try again.'
        });
    } finally {
        setIsExtracting(false);
    }
};


  async function onSubmit(values: ChannelFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
      if (channel) {
        const channelRef = doc(db, 'channels', channel.id);
        await updateDoc(channelRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(projectId, 'channel_updated', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Channel updated successfully.' });
      } else {
        await addDoc(collection(db, 'channels'), {
          ...values,
          projectId: projectId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(projectId, 'channel_created', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Channel created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting channel form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Channel Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Summer Campaign Website" {...field} />
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
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {channelTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            {channelStatuses.map(status => (
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
            name="notes"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                    <Textarea placeholder="Internal notes about the channel..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {channel ? 'Update' : 'Create'} Channel
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
                        placeholder="e.g., 'Our main blog at example.com/blog' or paste channel info..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="h-32"
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
                <Button className='w-full' onClick={handleExtractDetails} disabled={isExtracting}>
                    {isExtracting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Extract Details
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
