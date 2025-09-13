
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
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { logActivity } from '@/lib/activity-log';

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

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: category || {
      name: '',
      sku: '',
      notes: '',
    },
  });

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
                <FormLabel>SKU (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="Unique Product Code" {...field} />
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
  );
}
