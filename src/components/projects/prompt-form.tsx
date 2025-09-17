
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { AIPrompt } from '@/lib/types';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  body: z.string().min(1, 'Prompt body cannot be empty.'),
  category: z.string().optional(),
});

type PromptFormValues = z.infer<typeof formSchema>;

interface PromptFormProps {
  prompt?: AIPrompt;
  projectId: string;
  closeForm: () => void;
}

export function PromptForm({ prompt, projectId, closeForm }: PromptFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: prompt || {
      title: '',
      description: '',
      body: '',
      category: '',
    },
  });

  async function onSubmit(values: PromptFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    setIsSubmitting(true);
    try {
        const data = {
            projectId,
            ...values,
            updatedAt: serverTimestamp(),
        };

        if (prompt) {
            const promptRef = doc(db, 'aiPrompts', prompt.id);
            await updateDoc(promptRef, data);
            toast({ title: 'Success', description: 'Prompt updated.' });
        } else {
            await addDoc(collection(db, 'aiPrompts'), { ...data, createdAt: serverTimestamp() });
            toast({ title: 'Success', description: 'Prompt created.' });
        }
        
      form.reset();
      closeForm();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save prompt.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl><Input placeholder="e.g., Generate blog post ideas" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl><Input placeholder="e.g., Marketing" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl><Textarea placeholder="What is this prompt for?" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prompt Body</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="You are an expert... Use these variables: {{variable}}"
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {prompt ? 'Update Prompt' : 'Create Prompt'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
