
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
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logActivity } from '@/lib/activity-log';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  content: z.string().min(1, { message: 'Note cannot be empty.' }),
});

type NoteFormValues = z.infer<typeof formSchema>;

interface NoteFormProps {
  projectId: string;
}

export function NoteForm({ projectId }: NoteFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: '' },
  });

  async function onSubmit(values: NoteFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'notes'), {
        projectId,
        authorUid: user.uid,
        content: values.content,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logActivity(projectId, 'note_added', { content: values.content.substring(0, 50) }, user.uid);
      form.reset();
      toast({ title: 'Success', description: 'Note added successfully.' });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add your note.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Type your note here..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Note
          </Button>
        </div>
      </form>
    </Form>
  );
}
