
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Vendor, Channel } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, PlusCircle, Trash2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { logActivity } from '@/lib/activity-log';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { extractVendorDetails, type ExtractVendorDetailsOutput } from '@/ai/flows/extract-vendor-details-flow';

const socialPlatforms = ['LinkedIn', 'Twitter', 'GitHub', 'Facebook', 'Instagram', 'TikTok', 'Website'];

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  serviceType: z.string().min(2, { message: 'Service type is required.' }),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  socials: z.array(z.object({
    platform: z.string().min(1, 'Platform is required'),
    url: z.string().url('Must be a valid URL'),
  })).optional(),
  notes: z.string().optional(),
  channelId: z.string().optional(),
});

type VendorFormValues = z.infer<typeof formSchema>;

interface VendorFormProps {
  vendor?: Vendor;
  projectId: string;
  channels: Channel[];
  closeForm: () => void;
}

export function VendorForm({ vendor, projectId, channels, closeForm }: VendorFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImage, setAiImage] = useState<File | null>(null);

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: vendor ? {
      ...vendor,
      contactName: vendor.contactName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      socials: vendor.socials || [],
      notes: vendor.notes || '',
      channelId: vendor.channelId || '',
    } : {
      name: '',
      sku: `VEND-${uuidv4().substring(0, 8).toUpperCase()}`,
      serviceType: '',
      contactName: '',
      email: '',
      phone: '',
      socials: [],
      notes: '',
      channelId: channels[channels.length - 1]?.id || '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "socials",
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setAiImage(event.target.files[0]);
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
        
        const extractedData: ExtractVendorDetailsOutput = await extractVendorDetails({
            prompt: aiPrompt,
            imageDataUri: imageDataUri
        });

        if (extractedData.name) form.setValue('name', extractedData.name);
        if (extractedData.serviceType) form.setValue('serviceType', extractedData.serviceType);
        if (extractedData.contactName) form.setValue('contactName', extractedData.contactName);
        if (extractedData.email) form.setValue('email', extractedData.email);
        if (extractedData.phone) form.setValue('phone', extractedData.phone);
        if (extractedData.notes) form.setValue('notes', extractedData.notes);
        if (extractedData.socials) {
            form.setValue('socials', extractedData.socials);
        }

        toast({
            title: 'Details Extracted',
            description: 'The AI has filled the form with the extracted details. Please review them.'
        });

    } catch (error) {
        console.error('Error extracting vendor details:', error);
        toast({
            variant: 'destructive',
            title: 'Extraction Failed',
            description: 'The AI could not extract details. Please try again.'
        });
    } finally {
        setIsExtracting(false);
    }
  };

  async function onSubmit(data: VendorFormValues) {
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
      if (vendor) {
        const vendorRef = doc(db, 'vendors', vendor.id);
        await updateDoc(vendorRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(projectId, 'vendor_updated' as any, { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Vendor updated successfully.' });
      } else {
        await addDoc(collection(db, 'vendors'), {
          ...values,
          projectId: projectId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(projectId, 'vendor_created' as any, { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Vendor created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting vendor form: ", error);
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
                    <FormLabel>Vendor Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Acme Web Services" {...field} />
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
            <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Hosting, Design" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Contact Name (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Jane Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. jane@acme.com" {...field} />
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
                            <FormLabel>Contact Phone</FormLabel>
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

            <FormField
                    control={form.control}
                    name="channelId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>From</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
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

            <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                    <Textarea placeholder="Any notes about this vendor..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {vendor ? 'Update' : 'Create'} Vendor
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
                        placeholder="Paste vendor info..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="h-32"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ai-image">Image</Label>
                    <Input id="ai-image" type="file" accept="image/*" onChange={handleFileChange} />
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
