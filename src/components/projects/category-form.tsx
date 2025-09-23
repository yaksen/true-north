
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Sparkles, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { logActivity } from '@/lib/activity-log';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { extractCategoryDetails, type ExtractCategoryDetailsOutput } from '@/ai/flows/extract-category-details-flow';
import Image from 'next/image';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: z.string().optional(),
  notes: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryFormProps {
  category?: Category;
  projectId: string;
  closeForm: () => void;
}

export function CategoryForm({ category, projectId, closeForm }: CategoryFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImage, setAiImage] = useState<File | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: category || {
      name: '',
      sku: `CAT-${uuidv4().substring(0, 8).toUpperCase()}`,
      notes: '',
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
        
        const extractedData: ExtractCategoryDetailsOutput = await extractCategoryDetails({
            prompt: aiPrompt,
            imageDataUri: imageDataUri
        });

        if (extractedData.name) form.setValue('name', extractedData.name);
        if (extractedData.notes) form.setValue('notes', extractedData.notes);

        toast({
            title: 'Details Extracted',
            description: 'The AI has filled the form with the extracted details. Please review them.'
        });

    } catch (error) {
        console.error('Error extracting category details:', error);
        toast({
            variant: 'destructive',
            title: 'Extraction Failed',
            description: 'The AI could not extract details. Please try again.'
        });
    } finally {
        setIsExtracting(false);
    }
};

  async function onSubmit(values: CategoryFormValues) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (category) {
        const categoryRef = doc(db, 'categories', category.id);
        await updateDoc(categoryRef, { ...values, updatedAt: serverTimestamp() });
        await logActivity(projectId, 'category_updated', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Category updated successfully.' });
      } else {
        await addDoc(collection(db, 'categories'), {
          ...values,
          projectId: projectId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await logActivity(projectId, 'category_created', { name: values.name }, user.uid);
        toast({ title: 'Success', description: 'Category created successfully.' });
      }
      closeForm();
    } catch (error) {
      console.error("Error submitting category form: ", error);
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
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Web Development" {...field} />
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
            name="notes"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                    <Textarea placeholder="Internal notes about this category..." {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {category ? 'Update' : 'Create'} Category
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
                        placeholder="e.g., 'A category for all our design services.'"
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

    