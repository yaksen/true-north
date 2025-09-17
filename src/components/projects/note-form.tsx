
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
import { logActivity } from '@/lib/activity-log';
import { Loader2, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Note } from '@/lib/types';
import { Badge } from '../ui/badge';

const formSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }),
  content: z.string().min(1, { message: 'Note content cannot be empty.' }),
  tags: z.array(z.string()).default([]),
});

type NoteFormValues = z.infer<typeof formSchema>;

interface NoteFormProps {
  note?: Note;
  projectId: string;
  closeForm: () => void;
}

export function NoteForm({ note, projectId, closeForm }: NoteFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: note || { 
        title: '',
        content: '',
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


  async function onSubmit(values: NoteFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    setIsSubmitting(true);
    try {
        const data = {
            projectId,
            authorUid: user.uid,
            ...values,
            updatedAt: serverTimestamp(),
        }

        if (note) {
            const noteRef = doc(db, 'notes', note.id);
            await updateDoc(noteRef, data);
            toast({ title: 'Success', description: 'Note updated successfully.' });
        } else {
            await addDoc(collection(db, 'notes'), { ...data, createdAt: serverTimestamp() });
            await logActivity(projectId, 'note_added', { content: values.title }, user.uid);
            toast({ title: 'Success', description: 'Note added successfully.' });
        }
      
      form.reset();
      closeForm();
    } catch (error) {
      console.error('Error adding note:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save your note.' });
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
                    <FormControl><Input placeholder="e.g., Meeting with Client" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                    <Textarea
                    placeholder="Type your note here. Markdown is supported."
                    className="min-h-[200px]"
                    {...field}
                    />
                </FormControl>
                <FormMessage />
            </FormItem>
          )}
        />
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
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {note ? 'Update Note' : 'Add Note'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
