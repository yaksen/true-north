

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PortfolioNote, Category, Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const formSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  description: z.string().optional(),
  categoryId: z.string().nonempty("Category is required."),
  serviceId: z.string().nonempty("Service is required."),
});

type FormValues = z.infer<typeof formSchema>;

interface PortfolioNoteFormProps {
  note?: PortfolioNote;
  projectId: string;
  categories: Category[];
  services: Service[];
  closeForm: () => void;
}

export function PortfolioNoteForm({ note, projectId, categories, services, closeForm }: PortfolioNoteFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: note || {
      title: '',
      description: '',
      categoryId: '',
      serviceId: '',
    },
  });
  
  const selectedCategoryId = form.watch('categoryId');

  const filteredServices = useMemo(() => {
    return services.filter(service => service.categoryId === selectedCategoryId);
  }, [services, selectedCategoryId]);

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setIsSubmitting(true);

    try {
        const dataToSave = {
            ...values,
            projectId: projectId,
            updatedAt: serverTimestamp(),
        }
        if (note) {
            const noteRef = doc(db, 'portfolioNotes', note.id);
            await updateDoc(noteRef, dataToSave);
            toast({ title: 'Success', description: 'Portfolio note updated.' });
        } else {
            await addDoc(collection(db, 'portfolioNotes'), {
                ...dataToSave,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Success', description: 'Portfolio note created.' });
        }
        closeForm();
    } catch (error) {
        console.error("Error submitting portfolio note:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
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
              <FormControl>
                <Input placeholder="e.g., Social Media Graphics Q3" {...field} />
              </FormControl>
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
              <FormControl>
                <Textarea placeholder="A brief description of this collection of work." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); form.setValue('serviceId', ''); }} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Service</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategoryId || filteredServices.length === 0}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a service..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {filteredServices.map(service => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {note ? 'Update Note' : 'Create Note'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
