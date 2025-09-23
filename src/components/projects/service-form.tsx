
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Service, Category, Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Sparkles, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAuth } from '@/hooks/use-auth';
import { logActivity } from '@/lib/activity-log';
import { CurrencyInput } from '../ui/currency-input';
import { useCurrency } from '@/context/CurrencyContext';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { extractServiceDetails, type ExtractServiceDetailsOutput } from '@/ai/flows/extract-service-details-flow';
import Image from 'next/image';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  categoryId: z.string({ required_error: 'Category is required.' }),
  finishTime: z.string().min(1, { message: 'Finish time is required.' }),
  price: z.coerce.number().min(0, { message: 'Price must be non-negative.' }),
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP']),
  notes: z.string().optional(),
});

type ServiceFormValues = z.infer<typeof formSchema>;

interface ServiceFormProps {
  service?: Service;
  project: Project;
  categories: Category[];
  closeForm: () => void;
}

export function ServiceForm({ service, project, categories, closeForm }: ServiceFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { globalCurrency } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImage, setAiImage] = useState<File | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);

  const [timeValue, setTimeValue] = useState(() => service?.finishTime?.split(' ')[0] || '1');
  const [timeUnit, setTimeUnit] = useState(() => service?.finishTime?.split(' ')[1] || 'Days');


  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: service || {
      name: '',
      sku: `SVC-${uuidv4().substring(0, 8).toUpperCase()}`,
      categoryId: '',
      finishTime: '1 Days',
      price: 0,
      currency: project.currency || (globalCurrency as any) || 'USD',
      notes: '',
    },
  });

  const handleTimeChange = (value: string, unit: string) => {
    setTimeValue(value);
    setTimeUnit(unit);
    form.setValue('finishTime', `${value} ${unit}`);
  }
  
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
        
        const extractedData: ExtractServiceDetailsOutput = await extractServiceDetails({
            prompt: aiPrompt,
            imageDataUri: imageDataUri
        });

        if (extractedData.name) form.setValue('name', extractedData.name);
        if (extractedData.price) form.setValue('price', extractedData.price);
        if (extractedData.currency) form.setValue('currency', extractedData.currency);
        if (extractedData.finishTime) {
            const [val, unit] = extractedData.finishTime.split(' ');
            if (val && unit) {
                handleTimeChange(val, unit);
            }
        }
        if (extractedData.notes) form.setValue('notes', extractedData.notes);

        toast({
            title: 'Details Extracted',
            description: 'The AI has filled the form with the extracted details. Please review them.'
        });

    } catch (error) {
        console.error('Error extracting service details:', error);
        toast({
            variant: 'destructive',
            title: 'Extraction Failed',
            description: 'The AI could not extract details. Please try again.'
        });
    } finally {
        setIsExtracting(false);
    }
};


  async function onSubmit(values: ServiceFormValues) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (service) {
        const serviceRef = doc(db, 'services', service.id);
        await updateDoc(serviceRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(project.id, 'service_updated', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Service updated successfully.' });
      } else {
        await addDoc(collection(db, 'services'), {
          ...values,
          projectId: project.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(project.id, 'service_created', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Service created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting service form: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Basic Website Design" {...field} />
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
            <div className='grid grid-cols-2 gap-4'>
                <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="finishTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Finish Time</FormLabel>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    value={timeValue}
                                    onChange={(e) => handleTimeChange(e.target.value, timeUnit)}
                                    className="w-24"
                                />
                                <Select 
                                    value={timeUnit}
                                    onValueChange={(unit) => handleTimeChange(timeValue, unit)}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Minutes">Minutes</SelectItem>
                                        <SelectItem value="Hours">Hours</SelectItem>
                                        <SelectItem value="Days">Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Price</FormLabel>
                        <CurrencyInput
                            value={field.value}
                            onValueChange={field.onChange}
                            currency={form.watch('currency')}
                            onCurrencyChange={(value) => form.setValue('currency', value)}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                    <Textarea placeholder="Describe what this service includes..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {service ? 'Update' : 'Create'} Service
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
                        placeholder="e.g., 'Logo design service, takes 3 days, costs $500.'"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="h-24"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Image</Label>
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

    