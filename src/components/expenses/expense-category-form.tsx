
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { PersonalExpenseCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  emoji: z.string().min(1, 'Emoji is required.'),
  color: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface ExpenseCategoryFormProps {
  category?: PersonalExpenseCategory;
  closeForm: () => void;
}

const colorPalette = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
    '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548', '#9e9e9e',
    '#607d8b', '#ffffff', '#000000', '#fca5a5', '#93c5fd', '#a7f3d0'
];

export function ExpenseCategoryForm({ category, closeForm }: ExpenseCategoryFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: category || {
      name: '',
      emoji: '🛒',
      color: '#009688',
    },
  });

  async function onSubmit(values: CategoryFormValues) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      if (category) {
        const categoryRef = doc(db, 'personalExpenseCategories', category.id);
        await updateDoc(categoryRef, { ...values, updatedAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Category updated.' });
      } else {
        await addDoc(collection(db, 'personalExpenseCategories'), {
          ...values,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: 'Success', description: 'Category created.' });
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
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Groceries" {...field} />
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
                        <Input placeholder="🛒" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                    <div className='grid grid-cols-8 gap-2'>
                        {colorPalette.map((color) => (
                            <button
                                type="button"
                                key={color}
                                onClick={() => field.onChange(color)}
                                className={cn(
                                    "h-8 w-8 rounded-full border flex items-center justify-center",
                                    field.value === color && "ring-2 ring-ring ring-offset-2"
                                )}
                                style={{ backgroundColor: color }}
                            >
                                {field.value === color && <Check className={cn(color === '#000000' || color === '#607d8b' ? 'text-white' : 'text-black', "h-4 w-4")} />}
                                <span className='sr-only'>{color}</span>
                            </button>
                        ))}
                    </div>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {category ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
