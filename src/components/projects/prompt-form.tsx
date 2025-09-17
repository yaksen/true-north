
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
import { Loader2, X } from 'lucide-react';
import { Input } from '../ui/input';
import { AIPrompt } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  category: z.string().optional(),
  role: z.string().min(1, 'Role/Context is required.'),
  task: z.string().min(1, 'Task is required.'),
  constraints: z.string().min(1, 'Constraints are required.'),
  examples: z.string().optional(),
  instructions: z.string().optional(),
  outputFormat: z.string().min(1, 'Output format is required.'),
  tags: z.array(z.string()).default([]),
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
  const [tagInput, setTagInput] = useState('');

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: prompt || {
      title: '',
      description: '',
      category: '',
      role: '',
      task: '',
      constraints: '',
      examples: '',
      instructions: '',
      outputFormat: '',
      tags: [],
    },
  });

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !form.getValues('tags').includes(newTag)) {
        form.setValue('tags', [...form.getValues('tags'), newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    form.setValue('tags', form.getValues('tags').filter(tag => tag !== tagToRemove));
  };


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
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ScrollArea className="h-[70vh] p-1">
        <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Generate blog post ideas" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., Marketing" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="What is this prompt for?" {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role/Context</FormLabel><FormControl><Textarea placeholder="e.g., You are an expert copywriter..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="task" render={({ field }) => (<FormItem><FormLabel>Task</FormLabel><FormControl><Textarea placeholder="e.g., Generate 5 blog post titles..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="constraints" render={({ field }) => (<FormItem><FormLabel>Constraints</FormLabel><FormControl><Textarea placeholder="e.g., The tone should be formal..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="examples" render={({ field }) => (<FormItem><FormLabel>Examples (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Title 1: 'The Future of AI'" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="instructions" render={({ field }) => (<FormItem><FormLabel>Step-by-step Instructions (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., 1. Analyze the topic. 2. Brainstorm keywords..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="outputFormat" render={({ field }) => (<FormItem><FormLabel>Output Format</FormLabel><FormControl><Textarea placeholder="e.g., A JSON array of strings" {...field} /></FormControl><FormMessage /></FormItem>)} />

            <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                            <>
                                <Input
                                    placeholder="Add tags and press Enter"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                />
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {field.value.map(tag => (
                                        <Badge key={tag} variant="secondary">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)} className="ml-2 rounded-full hover:bg-muted-foreground/20">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 p-4 border-t">
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
