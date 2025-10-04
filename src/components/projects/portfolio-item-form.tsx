

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc } from 'firebase/firestore';
import { Project } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  fileUrl: z.string().url({ message: "Please enter a valid URL." }),
  fileName: z.string().min(1, "File name is required."),
});

type FormValues = z.infer<typeof formSchema>;

interface PortfolioItemFormProps {
  projectId: string;
  portfolioNoteId: string;
  closeForm: () => void;
}

export function PortfolioItemForm({ projectId, portfolioNoteId, closeForm }: PortfolioItemFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        fileUrl: '',
        fileName: '',
    }
  });


  async function onSubmit(values: FormValues) {
    if (!user) return;
    setIsSubmitting(true);

    try {
        await addDoc(collection(db, 'portfolioItems'), {
            portfolioNoteId: portfolioNoteId,
            fileName: values.fileName,
            fileUrl: values.fileUrl,
            fileType: 'link', // Assume it's a link now
            fileSize: 0,
            createdAt: serverTimestamp(),
        });
        
        toast({ title: 'Success', description: 'Item added to portfolio.' });
        closeForm();

    } catch (error: any) {
        console.error("Error adding portfolio item:", error);
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Something went wrong.' });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="fileUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File URL</FormLabel>
              <FormControl>
                 <Input placeholder="https://example.com/file.jpg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="fileName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File Name</FormLabel>
              <FormControl>
                 <Input placeholder="e.g., Final Logo Design" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Item
          </Button>
        </div>
      </form>
    </Form>
  );
}
