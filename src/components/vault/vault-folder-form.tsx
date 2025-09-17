
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { VaultFolder } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  emoji: z.string().optional(),
});

type FolderFormValues = z.infer<typeof formSchema>;

interface VaultFolderFormProps {
  folder?: VaultFolder;
  userId: string;
  closeForm: () => void;
}

export function VaultFolderForm({ folder, userId, closeForm }: VaultFolderFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FolderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: folder || {
      name: '',
      emoji: '📁',
    },
  });

  async function onSubmit(values: FolderFormValues) {
    setIsSubmitting(true);
    try {
      const data = {
        ...values,
        userId: userId,
        updatedAt: serverTimestamp(),
      };
      if (folder) {
        const folderRef = doc(db, 'vaultFolders', folder.id);
        await updateDoc(folderRef, data);
        toast({ title: 'Success', description: 'Folder updated.' });
      } else {
        await addDoc(collection(db, 'vaultFolders'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Folder created.' });
      }
      closeForm();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem className='col-span-2'>
                    <FormLabel>Folder Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Project Ideas" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="emoji"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Emoji</FormLabel>
                    <FormControl>
                        <Input placeholder="💡" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {folder ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
