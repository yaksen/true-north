

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
import { Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Note, NoteType } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

const noteTypes: NoteType[] = ["Message Templates", "Meeting Notes", "Ideas & Brainstorms", "Processes & SOPs", "Knowledge Snippets", "AI Prompts Library", "Client/Lead Notes", "Marketing Copy Drafts", "Decision Logs"];

const formSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }),
  content: z.string().min(1, { message: 'Note content cannot be empty.' }),
  type: z.enum(noteTypes),
  aiAccessible: z.boolean().default(true),
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

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: note || { 
        title: '',
        content: '',
        type: 'Meeting Notes',
        aiAccessible: true,
    },
  });

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
            name="type"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Note Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            {noteTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
            name="aiAccessible"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>AI Accessible</FormLabel>
                        <FormMessage />
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
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
