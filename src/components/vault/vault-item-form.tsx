

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, X } from 'lucide-react';
import { Input } from '../ui/input';
import { VaultFolder, VaultItem, VaultItemType } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  folderId: z.string().nonempty('Folder is required'),
  type: z.enum(['note', 'link', 'prompt']),
  tags: z.array(z.string()).default([]),
  // Fields for note/link
  content: z.string().optional(),
  // Fields for prompt
  role: z.string().optional(),
  task: z.string().optional(),
  constraints: z.string().optional(),
  examples: z.string().optional(),
  instructions: z.string().optional(),
  outputFormat: z.string().optional(),
}).refine(data => {
    if (data.type === 'prompt') {
        return data.role && data.task && data.constraints && data.outputFormat;
    }
    return data.content;
}, {
    message: 'Required fields for the selected type are missing.',
    path: ['content'], // Generic path, specific error messages are better handled in UI
});


type ItemFormValues = z.infer<typeof formSchema>;

interface VaultItemFormProps {
  item?: VaultItem;
  userId: string;
  folders: VaultFolder[];
  closeForm: () => void;
  defaultType?: VaultItemType;
}

export function VaultItemForm({ item, userId, folders, closeForm, defaultType }: VaultItemFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: item || { 
        title: '',
        content: '',
        folderId: '',
        type: defaultType || 'note',
        tags: [],
        role: '',
        task: '',
        constraints: '',
        examples: '',
        instructions: '',
        outputFormat: '',
    },
  });

  const itemType = form.watch('type');

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !form.getValues('tags').includes(newTag)) {
        form.setValue('tags', [...form.getValues('tags'), newTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    form.setValue('tags', form.getValues('tags').filter(tag => tag !== tagToRemove));
  };


  async function onSubmit(values: ItemFormValues) {
    setIsSubmitting(true);
    try {
        const data: Partial<VaultItem> = {
            userId,
            title: values.title,
            folderId: values.folderId,
            type: values.type,
            tags: values.tags,
            updatedAt: serverTimestamp() as any,
        };

        if (values.type === 'prompt') {
            data.role = values.role;
            data.task = values.task;
            data.constraints = values.constraints;
            data.examples = values.examples;
            data.instructions = values.instructions;
            data.outputFormat = values.outputFormat;
            data.content = ''; // Clear content field
        } else {
            data.content = values.content || '';
            // Clear prompt fields
            data.role = '';
            data.task = '';
            data.constraints = '';
            data.examples = '';
            data.instructions = '';
            data.outputFormat = '';
        }

        if (item) {
            const itemRef = doc(db, 'vaultItems', item.id);
            await updateDoc(itemRef, data);
            toast({ title: 'Success', description: 'Item updated successfully.' });
        } else {
            await addDoc(collection(db, 'vaultItems'), { ...data, createdAt: serverTimestamp() });
            toast({ title: 'Success', description: 'Item added to vault.' });
        }
      
      form.reset();
      closeForm();
    } catch (error) {
      console.error('Error saving vault item:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save your item.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[70vh] p-1">
            <div className='p-4 space-y-4'>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="title" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Title</FormLabel><FormControl><Input placeholder="My new brilliant idea" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="note">Note</SelectItem><SelectItem value="link">Link</SelectItem><SelectItem value="prompt">Prompt</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                </div>

                {itemType === 'prompt' ? (
                    <div className='space-y-4'>
                        <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role/Context</FormLabel><FormControl><Textarea placeholder="e.g., You are an expert copywriter..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="task" render={({ field }) => (<FormItem><FormLabel>Task</FormLabel><FormControl><Textarea placeholder="e.g., Generate 5 blog post titles..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="constraints" render={({ field }) => (<FormItem><FormLabel>Constraints</FormLabel><FormControl><Textarea placeholder="e.g., The tone should be formal..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="examples" render={({ field }) => (<FormItem><FormLabel>Examples (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Title 1: 'The Future of AI'" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="instructions" render={({ field }) => (<FormItem><FormLabel>Step-by-step Instructions (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., 1. Analyze the topic. 2. Brainstorm keywords..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="outputFormat" render={({ field }) => (<FormItem><FormLabel>Output Format</FormLabel><FormControl><Textarea placeholder="e.g., A JSON array of strings" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                ) : (
                    <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>Content</FormLabel><FormControl><Textarea placeholder={itemType === 'link' ? 'https://example.com' : 'Your note content...'} className="min-h-[150px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
                )}

                <div className='grid grid-cols-2 gap-4'>
                    <FormField control={form.control} name="folderId" render={({ field }) => (<FormItem><FormLabel>Folder</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a folder..." /></SelectTrigger></FormControl><SelectContent>{folders.map(f => (<SelectItem key={f.id} value={f.id}>{f.emoji} {f.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
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
                                {field.value && field.value.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                    {field.value.map((tag) => (
                                        <Badge key={tag} variant="secondary">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="ml-1 rounded-full hover:bg-muted-foreground/20"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                        </Badge>
                                    ))}
                                    </div>
                                )}
                                </>
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </div>
            </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 border-t pt-4 px-4">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {item ? 'Update Item' : 'Add Item'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
